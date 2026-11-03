import { DomainAllocation } from "./types";

/**
 * Deterministically distributes an integer amount among selected participants.
 *
 * Remainder distribution rule:
 * If an amount cannot be divided evenly among N participants,
 * participants are sorted deterministically by their member ID.
 * The remainder R (which is always < N) is distributed 1 unit each to the first R members.
 *
 * Example:
 * Rp100.000 among [A, B, C]:
 * base = 33.333
 * remainder = 1
 * A gets 33.334
 * B gets 33.333
 * C gets 33.333
 * Total = 100.000 exact
 */
export function distributeEquallyDeterministic(
  total: bigint,
  participantMemberIds: string[]
): DomainAllocation[] {
  if (participantMemberIds.length === 0) {
    throw new Error("Daftar partisipan tidak boleh kosong");
  }

  if (total < 0n) {
    throw new Error("Nominal alokasi tidak boleh negatif");
  }

  // Sort participant IDs deterministically (lexicographically)
  const sortedIds = [...new Set(participantMemberIds)].sort((a, b) =>
    a.localeCompare(b)
  );

  const count = BigInt(sortedIds.length);
  const baseShare = total / count;
  const remainder = Number(total % count);

  const allocations: DomainAllocation[] = sortedIds.map((memberId, index) => {
    // The first `remainder` members receive 1 extra unit
    const extra = index < remainder ? 1n : 0n;
    return {
      memberId,
      amount: baseShare + extra,
    };
  });

  // Sanity invariant check: sum of allocations must equal total exactly
  const sum = allocations.reduce((acc, curr) => acc + curr.amount, 0n);
  if (sum !== total) {
    throw new Error(
      `Kesalahan pembulatan deterministik: Total alokasi (${sum}) tidak sama dengan nominal (${total})`
    );
  }

  return allocations;
}
