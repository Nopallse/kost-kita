import {
  DomainItem,
  DomainTransaction,
  DomainSettlement,
  HouseholdBalanceReport,
} from "./types";
import { calculateItemSubtotal } from "./allocations";

export class FinancialValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialValidationError";
  }
}

/**
 * Validates integrity of an item and its allocations.
 */
export function validateItem(item: DomainItem): void {
  const calculatedSubtotal = calculateItemSubtotal(item.quantity, item.unitPrice);
  if (item.subtotal !== calculatedSubtotal) {
    throw new FinancialValidationError(
      `Subtotal barang '${item.name}' tidak cocok: terhitung ${calculatedSubtotal}, tercatat ${item.subtotal}`
    );
  }

  const sumAllocations = item.allocations.reduce(
    (acc, alloc) => acc + alloc.amount,
    0n
  );

  if (sumAllocations !== item.subtotal) {
    throw new FinancialValidationError(
      `Integritas alokasi gagal pada item '${item.name}': Total alokasi (${sumAllocations}) tidak sama dengan subtotal (${item.subtotal})`
    );
  }
}

/**
 * Validates integrity of a full transaction:
 * 1. Total items subtotal must equal transaction totalAmount.
 * 2. Total payments disbursed must equal transaction totalAmount.
 * 3. Every individual item's allocations must be valid.
 */
export function validateTransaction(tx: DomainTransaction): void {
  if (tx.items.length === 0) {
    throw new FinancialValidationError(
      "Transaksi harus memiliki setidaknya satu item belanja"
    );
  }

  if (tx.payments.length === 0) {
    throw new FinancialValidationError(
      "Transaksi harus memiliki setidaknya satu pencatat pembayaran"
    );
  }

  // 1. Verify item subtotals sum to transaction totalAmount
  let itemsSum = 0n;
  for (const item of tx.items) {
    validateItem(item);
    itemsSum += item.subtotal;
  }

  if (itemsSum !== tx.totalAmount) {
    throw new FinancialValidationError(
      `Total transaksi tidak cocok dengan rincian item: Total transaksi ${tx.totalAmount}, jumlah item ${itemsSum}`
    );
  }

  // 2. Verify payments sum to transaction totalAmount
  const paymentsSum = tx.payments.reduce(
    (acc, payment) => acc + payment.amount,
    0n
  );

  if (paymentsSum !== tx.totalAmount) {
    throw new FinancialValidationError(
      `Total pembayaran tidak cocok: Total transaksi ${tx.totalAmount}, total dana disetor ${paymentsSum}`
    );
  }
}

/**
 * Validates integrity of a settlement reimbursement.
 */
export function validateSettlement(settlement: DomainSettlement): void {
  if (settlement.amount <= 0n) {
    throw new FinancialValidationError(
      "Nominal pelunasan (settlement) harus lebih besar dari Rp0"
    );
  }

  if (settlement.payerMemberId === settlement.payeeMemberId) {
    throw new FinancialValidationError(
      "Pengirim dan penerima pelunasan tidak boleh anggota yang sama"
    );
  }
}

/**
 * Verifies the ledger zero-sum invariant:
 * Sum of all member net balances must equal 0n.
 */
export function validateZeroSumReconciliation(
  report: HouseholdBalanceReport
): boolean {
  let netSum = 0n;
  for (const pos of report.positions.values()) {
    netSum += pos.netBalance;
  }

  if (netSum !== 0n) {
    throw new FinancialValidationError(
      `Diskrepansi buku kas terdeteksi! Jumlah saldo bersih seluruh anggota tidak seimbang (selisih: ${netSum})`
    );
  }

  return true;
}
