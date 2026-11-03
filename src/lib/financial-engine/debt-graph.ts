import { MemberBalancePosition, SimplifiedDebt } from "./types";

/**
 * Calculates the minimal set of pairwise settlements ("Who owes whom")
 * using a greedy balance-matching algorithm.
 *
 * Invariant:
 * The sum of all debts settled equals the total payable balances.
 * Total transfers are minimal and resolve all balances to 0.
 */
export function simplifyDebts(
  positions: Map<string, MemberBalancePosition> | MemberBalancePosition[]
): SimplifiedDebt[] {
  const positionList =
    positions instanceof Map ? Array.from(positions.values()) : positions;

  // Creditors: members with netBalance > 0 (owed money)
  const creditors: { memberId: string; balance: bigint }[] = [];

  // Debtors: members with netBalance < 0 (owe money)
  const debtors: { memberId: string; balance: bigint }[] = [];

  for (const pos of positionList) {
    if (pos.netBalance > 0n) {
      creditors.push({ memberId: pos.memberId, balance: pos.netBalance });
    } else if (pos.netBalance < 0n) {
      debtors.push({ memberId: pos.memberId, balance: -pos.netBalance }); // positive magnitude
    }
  }

  // Sort descending by amount for efficient matching
  creditors.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
  debtors.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));

  const debts: SimplifiedDebt[] = [];
  let cIndex = 0;
  let dIndex = 0;

  while (cIndex < creditors.length && dIndex < debtors.length) {
    const creditor = creditors[cIndex];
    const debtor = debtors[dIndex];

    const amount = creditor.balance < debtor.balance ? creditor.balance : debtor.balance;

    if (amount > 0n) {
      debts.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount,
      });

      creditor.balance -= amount;
      debtor.balance -= amount;
    }

    if (creditor.balance === 0n) {
      cIndex++;
    }
    if (debtor.balance === 0n) {
      dIndex++;
    }
  }

  return debts;
}

