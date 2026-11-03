export type SplitType = "SHARED" | "PERSONAL" | "CUSTOM";

export type TransactionStatus = "CONFIRMED" | "VOIDED";

export type SettlementStatus = "PENDING" | "CONFIRMED" | "REJECTED";

/**
 * An item allocation represents who is financially responsible for an item's cost.
 */
export interface DomainAllocation {
  memberId: string;
  amount: bigint;
}

/**
 * An item in a financial transaction.
 */
export interface DomainItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: bigint;
  subtotal: bigint; // quantity * unitPrice
  splitType: SplitType;
  allocations: DomainAllocation[];
}

/**
 * A payment record represents actual money disbursed by a member.
 */
export interface DomainPayment {
  memberId: string;
  amount: bigint;
}

/**
 * A financial transaction header containing items and payments.
 */
export interface DomainTransaction {
  id?: string;
  householdId: string;
  title: string;
  date: Date;
  status: TransactionStatus;
  totalAmount: bigint;
  items: DomainItem[];
  payments: DomainPayment[];
}

/**
 * A reimbursement transfer between household members.
 */
export interface DomainSettlement {
  id?: string;
  householdId: string;
  payerMemberId: string; // The debtor who transfers money
  payeeMemberId: string; // The creditor who receives money
  amount: bigint;
  status: SettlementStatus;
  confirmedAt?: Date | null;
}

/**
 * Net financial position of a household member.
 */
export interface MemberBalancePosition {
  memberId: string;
  totalPaid: bigint;
  totalResponsibility: bigint;
  settlementsSent: bigint; // Confirmed settlements paid to others
  settlementsReceived: bigint; // Confirmed settlements received from others
  netBalance: bigint; // totalPaid - totalResponsibility + settlementsSent - settlementsReceived
  status: "RECEIVABLE" | "PAYABLE" | "BALANCED";
}

/**
 * Overall household balance reconciliation summary.
 */
export interface HouseholdBalanceReport {
  householdId: string;
  positions: Map<string, MemberBalancePosition>;
  totalHouseholdExpense: bigint;
  totalPaid: bigint;
  totalResponsibility: bigint;
  isReconciled: boolean; // sum(netBalance) === 0n
  discrepancy: bigint;
}

/**
 * Pairwise debt instruction ("Debtor owes Creditor amount")
 */
export interface SimplifiedDebt {
  fromMemberId: string; // Debtor
  toMemberId: string; // Creditor
  amount: bigint;
}
