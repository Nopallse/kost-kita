import { DomainAllocation } from "./types";
import { distributeEquallyDeterministic } from "./rounding";

/**
 * Calculates item subtotal: quantity * unitPrice
 */
export function calculateItemSubtotal(quantity: number, unitPrice: bigint): bigint {
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error("Kuantitas barang harus berupa bilangan bulat positif lebih besar dari 0");
  }
  if (unitPrice < 0n) {
    throw new Error("Harga satuan tidak boleh bernilai negatif");
  }
  return BigInt(quantity) * unitPrice;
}

/**
 * Creates SHARED allocations equally among selected members with deterministic remainder distribution.
 */
export function createSharedAllocation(
  subtotal: bigint,
  participantMemberIds: string[]
): DomainAllocation[] {
  return distributeEquallyDeterministic(subtotal, participantMemberIds);
}

/**
 * Creates PERSONAL allocation assigned 100% to a single member.
 */
export function createPersonalAllocation(
  subtotal: bigint,
  memberId: string
): DomainAllocation[] {
  if (!memberId || memberId.trim() === "") {
    throw new Error("ID anggota untuk alokasi personal wajib diisi");
  }
  if (subtotal < 0n) {
    throw new Error("Nominal alokasi tidak boleh negatif");
  }

  return [
    {
      memberId: memberId.trim(),
      amount: subtotal,
    },
  ];
}

/**
 * Validates and creates CUSTOM allocations with explicit amounts.
 * Sum of explicit amounts must equal subtotal exactly.
 */
export function createCustomAllocation(
  subtotal: bigint,
  explicitAllocations: { memberId: string; amount: bigint }[]
): DomainAllocation[] {
  if (explicitAllocations.length === 0) {
    throw new Error("Alokasi kustom harus memiliki minimal satu anggota");
  }

  let runningSum = 0n;
  const sanitizedAllocations: DomainAllocation[] = [];

  for (const alloc of explicitAllocations) {
    if (alloc.amount < 0n) {
      throw new Error(`Nominal alokasi untuk anggota ${alloc.memberId} tidak boleh negatif`);
    }
    runningSum += alloc.amount;
    sanitizedAllocations.push({
      memberId: alloc.memberId,
      amount: alloc.amount,
    });
  }

  if (runningSum !== subtotal) {
    throw new Error(
      `Alokasi kustom tidak seimbang: Total alokasi (${runningSum.toString()}) harus sama persis dengan subtotal barang (${subtotal.toString()})`
    );
  }

  return sanitizedAllocations;
}
