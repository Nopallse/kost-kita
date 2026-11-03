import {
  DomainTransaction,
  DomainSettlement,
  MemberBalancePosition,
  HouseholdBalanceReport,
} from "./types";
import { validateTransaction, validateSettlement } from "./validators";

/**
 * Calculates net balance positions for all household members across all transactions and settlements.
 *
 * Mathematical formula:
 * Net Balance = Total Paid - Total Responsibility + Confirmed Settlements Sent - Confirmed Settlements Received
 *
 * Notice:
 * - Settlements sent (paid out) reduce your debt or increase your receivable (moves positive).
 * - Settlements received reduce your receivable (moves towards zero).
 *
 * Rules:
 * - Only CONFIRMED transactions affect balances (VOIDED transactions are ignored).
 * - Only CONFIRMED settlements affect balances (PENDING and REJECTED have ZERO effect).
 * - Invariant: Sum of all member net balances must equal 0n when ledger is valid.
 */
export function calculateHouseholdBalances(
  householdId: string,
  memberIds: string[],
  transactions: DomainTransaction[],
  settlements: DomainSettlement[] = []
): HouseholdBalanceReport {
  const positions = new Map<string, MemberBalancePosition>();

  // Initialize position for every known member
  for (const memberId of memberIds) {
    positions.set(memberId, {
      memberId,
      totalPaid: 0n,
      totalResponsibility: 0n,
      settlementsSent: 0n,
      settlementsReceived: 0n,
      netBalance: 0n,
      status: "BALANCED",
    });
  }

  const getOrCreatePosition = (memberId: string): MemberBalancePosition => {
    let pos = positions.get(memberId);
    if (!pos) {
      pos = {
        memberId,
        totalPaid: 0n,
        totalResponsibility: 0n,
        settlementsSent: 0n,
        settlementsReceived: 0n,
        netBalance: 0n,
        status: "BALANCED",
      };
      positions.set(memberId, pos);
    }
    return pos;
  };

  let totalHouseholdExpense = 0n;

  // 1. Process Transactions
  for (const tx of transactions) {
    // Only CONFIRMED transactions affect the ledger (VOIDED transactions are excluded)
    if (tx.status !== "CONFIRMED") {
      continue;
    }

    validateTransaction(tx);
    totalHouseholdExpense += tx.totalAmount;

    // Accumulate payments disbursed
    for (const payment of tx.payments) {
      const pos = getOrCreatePosition(payment.memberId);
      pos.totalPaid += payment.amount;
    }

    // Accumulate responsibility from item allocations
    for (const item of tx.items) {
      for (const alloc of item.allocations) {
        const pos = getOrCreatePosition(alloc.memberId);
        pos.totalResponsibility += alloc.amount;
      }
    }
  }

  // 2. Process Settlements
  for (const settlement of settlements) {
    validateSettlement(settlement);

    // Only CONFIRMED settlements affect the ledger balances!
    // PENDING and REJECTED settlements have zero effect.
    if (settlement.status !== "CONFIRMED") {
      continue;
    }

    const payerPos = getOrCreatePosition(settlement.payerMemberId);
    const payeePos = getOrCreatePosition(settlement.payeeMemberId);

    payerPos.settlementsSent += settlement.amount;
    payeePos.settlementsReceived += settlement.amount;
  }

  // 3. Compute Net Balances and Status
  let grandTotalPaid = 0n;
  let grandTotalResponsibility = 0n;
  let sumNetBalances = 0n;

  for (const pos of positions.values()) {
    pos.netBalance =
      pos.totalPaid -
      pos.totalResponsibility +
      pos.settlementsSent -
      pos.settlementsReceived;

    if (pos.netBalance > 0n) {
      pos.status = "RECEIVABLE";
    } else if (pos.netBalance < 0n) {
      pos.status = "PAYABLE";
    } else {
      pos.status = "BALANCED";
    }

    grandTotalPaid += pos.totalPaid;
    grandTotalResponsibility += pos.totalResponsibility;
    sumNetBalances += pos.netBalance;
  }

  return {
    householdId,
    positions,
    totalHouseholdExpense,
    totalPaid: grandTotalPaid,
    totalResponsibility: grandTotalResponsibility,
    isReconciled: sumNetBalances === 0n,
    discrepancy: sumNetBalances,
  };
}
