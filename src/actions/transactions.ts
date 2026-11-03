"use server";

import { prisma } from "@/lib/db";
import { requireHouseholdMember } from "@/lib/auth-guard";
import { createTransactionSchema, type CreateTransactionInput } from "@/schemas/transaction";
import {
  calculateItemSubtotal,
  createSharedAllocation,
  createPersonalAllocation,
  createCustomAllocation,
  validateTransaction,
  DomainTransaction,
  DomainItem,
  DomainAllocation,
} from "@/lib/financial-engine";
import { TransactionStatus, SplitType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type TransactionActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Creates a new itemized transaction inside an isolated Prisma database transaction.
 */
export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<TransactionActionResult<{ transactionId: string }>> {
  try {
    const validated = createTransactionSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || "Data transaksi tidak valid",
      };
    }

    const { householdId, title, date, categoryId, notes, items, payments } = validated.data;
    const { user, membership } = await requireHouseholdMember(householdId);

    // 1. Process items and build allocations via financial engine
    const domainItems: DomainItem[] = [];
    let calculatedTotalAmount = 0n;

    for (const itemInput of items) {
      const subtotal = calculateItemSubtotal(
        itemInput.quantity,
        BigInt(Math.round(itemInput.unitPrice))
      );
      calculatedTotalAmount += subtotal;

      let allocations: DomainAllocation[];

      if (itemInput.splitType === "SHARED") {
        if (!itemInput.participantMemberIds || itemInput.participantMemberIds.length === 0) {
          throw new Error(`Item '${itemInput.name}' bertipe SHARED harus memiliki minimal 1 partisipan`);
        }
        allocations = createSharedAllocation(subtotal, itemInput.participantMemberIds);
      } else if (itemInput.splitType === "PERSONAL") {
        if (!itemInput.assignedMemberId) {
          throw new Error(`Item '${itemInput.name}' bertipe PERSONAL wajib memilih 1 anggota penanggung jawab`);
        }
        allocations = createPersonalAllocation(subtotal, itemInput.assignedMemberId);
      } else if (itemInput.splitType === "CUSTOM") {
        if (!itemInput.customAllocations || itemInput.customAllocations.length === 0) {
          throw new Error(`Item '${itemInput.name}' bertipe CUSTOM harus memiliki daftar alokasi nominal`);
        }
        allocations = createCustomAllocation(
          subtotal,
          itemInput.customAllocations.map((a) => ({
            memberId: a.memberId,
            amount: BigInt(Math.round(a.amount)),
          }))
        );
      } else {
        throw new Error(`Tipe pembagian tidak dikenal: ${itemInput.splitType}`);
      }

      domainItems.push({
        name: itemInput.name,
        quantity: itemInput.quantity,
        unitPrice: BigInt(Math.round(itemInput.unitPrice)),
        subtotal,
        splitType: itemInput.splitType as SplitType,
        allocations,
      });
    }

    // 2. Process payments
    const domainPayments = payments.map((p) => ({
      memberId: p.memberId,
      amount: BigInt(Math.round(p.amount)),
    }));

    // 3. Domain validation via Financial Engine
    const domainTx: DomainTransaction = {
      householdId,
      title,
      date: new Date(date),
      status: "CONFIRMED",
      totalAmount: calculatedTotalAmount,
      items: domainItems,
      payments: domainPayments,
    };

    validateTransaction(domainTx);

    // 4. Atomic database mutation
    const createdTransaction = await prisma.$transaction(async (tx) => {
      // Create Transaction Header
      const header = await tx.transaction.create({
        data: {
          householdId,
          creatorMemberId: membership.id,
          title,
          date: new Date(date),
          status: TransactionStatus.CONFIRMED,
          totalAmount: calculatedTotalAmount,
          categoryId: categoryId || null,
          notes: notes || null,
        },
      });

      // Create Items & Allocations
      for (const item of domainItems) {
        const createdItem = await tx.transactionItem.create({
          data: {
            transactionId: header.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            splitType: item.splitType,
          },
        });

        await tx.itemAllocation.createMany({
          data: item.allocations.map((alloc) => ({
            transactionItemId: createdItem.id,
            memberId: alloc.memberId,
            amount: alloc.amount,
          })),
        });
      }

      // Create Payments
      await tx.transactionPayment.createMany({
        data: domainPayments.map((payment) => ({
          transactionId: header.id,
          memberId: payment.memberId,
          amount: payment.amount,
        })),
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "TRANSACTION",
          entityId: header.id,
          action: "CREATE",
          actorUserId: user.id,
          metadata: {
            title,
            totalAmount: calculatedTotalAmount.toString(),
            itemCount: domainItems.length,
          },
        },
      });

      return header;
    });

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/balances");

    return {
      success: true,
      data: { transactionId: createdTransaction.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mencatat transaksi";
    return { success: false, error: message };
  }
}

/**
 * Voids a transaction atomically (preserves audit log history, excludes from balance).
 */
export async function voidTransactionAction(
  householdId: string,
  transactionId: string,
  reason?: string
): Promise<TransactionActionResult> {
  try {
    const { user } = await requireHouseholdMember(householdId);

    const targetTx = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        householdId,
      },
    });

    if (!targetTx) {
      return { success: false, error: "Transaksi tidak ditemukan" };
    }

    if (targetTx.status === TransactionStatus.VOIDED) {
      return { success: false, error: "Transaksi ini sudah dibatalkan sebelumnya" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark status as VOIDED
      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.VOIDED },
      });

      // 2. Write immutable audit log
      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "TRANSACTION",
          entityId: transactionId,
          action: "VOID",
          actorUserId: user.id,
          metadata: {
            title: targetTx.title,
            totalAmount: targetTx.totalAmount.toString(),
            reason: reason || "Dibatalkan oleh anggota",
          },
        },
      });
    });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/balances");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membatalkan transaksi";
    return { success: false, error: message };
  }
}
