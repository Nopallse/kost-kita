import { prisma } from "@/lib/db";
import {
  calculateHouseholdBalances,
  simplifyDebts,
  DomainTransaction,
  DomainSettlement,
  HouseholdBalanceReport,
  SimplifiedDebt,
  MemberBalancePosition,
} from "@/lib/financial-engine";
import { TransactionStatus, SettlementStatus, SplitType } from "@prisma/client";

export interface EnrichedMemberPosition extends MemberBalancePosition {
  name: string;
  email?: string | null;
  role: string;
  isCurrentUser: boolean;
}

export interface EnrichedSimplifiedDebt extends SimplifiedDebt {
  fromMemberName: string;
  toMemberName: string;
  isCurrentUserDebtor: boolean;
  isCurrentUserCreditor: boolean;
}

export interface HouseholdBalanceData {
  report: HouseholdBalanceReport;
  enrichedPositions: EnrichedMemberPosition[];
  simplifiedDebts: EnrichedSimplifiedDebt[];
  pendingSettlementsCount: number;
}

/**
 * Computes canonical financial ledger balances and simplified debts for a household.
 */
export async function getHouseholdBalanceSummary(
  householdId: string,
  currentUserId?: string
): Promise<HouseholdBalanceData> {
  // 1. Fetch active household members
  const members = await prisma.householdMember.findMany({
    where: { householdId, isActive: true },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const memberIds = members.map((m) => m.id);
  const memberMap = new Map(
    members.map((m) => [
      m.id,
      {
        name: m.nickname || m.user.name || m.user.email?.split("@")[0] || "Anggota",
        email: m.user.email,
        role: m.role,
        isCurrentUser: m.userId === currentUserId,
      },
    ])
  );

  // 2. Fetch confirmed transactions with items, allocations, payments
  const dbTransactions = await prisma.transaction.findMany({
    where: {
      householdId,
      status: TransactionStatus.CONFIRMED,
    },
    include: {
      items: {
        include: {
          allocations: true,
        },
      },
      payments: true,
    },
  });

  // Map to pure DomainTransactions
  const domainTransactions: DomainTransaction[] = dbTransactions.map((tx) => ({
    id: tx.id,
    householdId: tx.householdId,
    title: tx.title,
    date: tx.date,
    status: tx.status as "CONFIRMED" | "VOIDED",
    totalAmount: tx.totalAmount,
    items: tx.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      splitType: item.splitType as "SHARED" | "PERSONAL" | "CUSTOM",
      allocations: item.allocations.map((a) => ({
        memberId: a.memberId,
        amount: a.amount,
      })),
    })),
    payments: tx.payments.map((p) => ({
      memberId: p.memberId,
      amount: p.amount,
    })),
  }));

  // 3. Fetch settlements
  const [dbConfirmedSettlements, pendingCount] = await Promise.all([
    prisma.settlement.findMany({
      where: {
        householdId,
        status: SettlementStatus.CONFIRMED,
      },
    }),
    prisma.settlement.count({
      where: {
        householdId,
        status: SettlementStatus.PENDING,
      },
    }),
  ]);

  const domainSettlements: DomainSettlement[] = dbConfirmedSettlements.map((s) => ({
    id: s.id,
    householdId: s.householdId,
    payerMemberId: s.payerMemberId,
    payeeMemberId: s.payeeMemberId,
    amount: s.amount,
    status: s.status as "PENDING" | "CONFIRMED" | "REJECTED",
    confirmedAt: s.confirmedAt,
  }));

  // 4. Calculate Net Balances via Financial Engine
  const report = calculateHouseholdBalances(
    householdId,
    memberIds,
    domainTransactions,
    domainSettlements
  );

  // 5. Enrich Member Positions with Names & Identity
  const enrichedPositions: EnrichedMemberPosition[] = Array.from(
    report.positions.values()
  ).map((pos) => {
    const meta = memberMap.get(pos.memberId) || {
      name: "Anggota",
      email: null,
      role: "MEMBER",
      isCurrentUser: false,
    };

    return {
      ...pos,
      name: meta.name,
      email: meta.email,
      role: meta.role,
      isCurrentUser: meta.isCurrentUser,
    };
  });

  // Sort: current user first, then creditors descending, then debtors ascending
  enrichedPositions.sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    return b.netBalance > a.netBalance ? 1 : b.netBalance < a.netBalance ? -1 : 0;
  });

  // 6. Simplify Pairwise Debts
  const rawDebts = simplifyDebts(report.positions);
  const enrichedDebts: EnrichedSimplifiedDebt[] = rawDebts.map((debt) => {
    const fromMeta = memberMap.get(debt.fromMemberId);
    const toMeta = memberMap.get(debt.toMemberId);

    return {
      ...debt,
      fromMemberName: fromMeta?.name || "Anggota",
      toMemberName: toMeta?.name || "Anggota",
      isCurrentUserDebtor: fromMeta?.isCurrentUser || false,
      isCurrentUserCreditor: toMeta?.isCurrentUser || false,
    };
  });

  return {
    report,
    enrichedPositions,
    simplifiedDebts: enrichedDebts,
    pendingSettlementsCount: pendingCount,
  };
}
