"use server";

import { prisma } from "@/lib/db";
import { requireHouseholdMember, AuthorizationError } from "@/lib/auth-guard";
import {
  createSettlementSchema,
  confirmSettlementSchema,
  rejectSettlementSchema,
  type CreateSettlementInput,
  type ConfirmSettlementInput,
  type RejectSettlementInput,
} from "@/schemas/settlement";
import { SettlementStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type SettlementActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Creates a new reimbursement settlement.
 * Direct settlement: Immediately saved as CONFIRMED so balances update instantly without pending approval.
 */
export async function createSettlementAction(
  input: CreateSettlementInput
): Promise<SettlementActionResult<{ settlementId: string }>> {
  try {
    const validated = createSettlementSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || "Data pelunasan tidak valid",
      };
    }

    const { householdId, payeeMemberId, amount, notes, proofUrl } = validated.data;
    const { user, membership: payerMembership } = await requireHouseholdMember(householdId);

    // Validate that payer is not paying themselves
    if (payerMembership.id === payeeMemberId) {
      return {
        success: false,
        error: "Pengirim dan penerima transfer pelunasan tidak boleh anggota yang sama.",
      };
    }

    // Verify payee exists and is active in the same household
    const payeeMembership = await prisma.householdMember.findFirst({
      where: {
        id: payeeMemberId,
        householdId,
        isActive: true,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!payeeMembership) {
      return {
        success: false,
        error: "Anggota penerima dana tidak ditemukan dalam rumah tangga ini.",
      };
    }

    const bigIntAmount = BigInt(Math.round(amount));
    const now = new Date();

    const settlement = await prisma.$transaction(async (tx) => {
      // 1. Create settlement record directly as CONFIRMED
      const created = await tx.settlement.create({
        data: {
          householdId,
          payerMemberId: payerMembership.id,
          payeeMemberId,
          amount: bigIntAmount,
          status: SettlementStatus.CONFIRMED,
          confirmedAt: now,
          notes: notes || null,
          proofUrl: proofUrl || null,
        },
      });

      // 2. Audit log
      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "SETTLEMENT",
          entityId: created.id,
          action: "RECORD_SETTLEMENT",
          actorUserId: user.id,
          metadata: {
            amount: bigIntAmount.toString(),
            payerMemberId: payerMembership.id,
            payeeMemberId,
            status: "CONFIRMED",
            autoConfirmed: true,
          },
        },
      });

      return created;
    });

    revalidatePath("/balances");
    revalidatePath("/settlements");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { settlementId: settlement.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mencatat pelunasan";
    return { success: false, error: message };
  }
}

/**
 * Confirms a settlement reimbursement.
 * Idempotency guarantee: If already confirmed, returns success without double-crediting!
 */
export async function confirmSettlementAction(
  input: ConfirmSettlementInput
): Promise<SettlementActionResult> {
  try {
    const validated = confirmSettlementSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: "Input konfirmasi tidak valid" };
    }

    const { householdId, settlementId } = validated.data;
    const { user, membership: actorMembership } = await requireHouseholdMember(householdId);

    const result = await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findFirst({
        where: { id: settlementId, householdId },
      });

      if (!settlement) {
        throw new Error("Data pelunasan tidak ditemukan");
      }

      // Idempotency check: if already confirmed, do nothing further!
      if (settlement.status === SettlementStatus.CONFIRMED) {
        return { alreadyConfirmed: true };
      }

      // Verify that actor is the payee (the one receiving money) or an Admin
      if (
        settlement.payeeMemberId !== actorMembership.id &&
        actorMembership.role !== Role.ADMIN
      ) {
        throw new AuthorizationError(
          "Hanya penerima transfer dana atau Admin yang berhak mengonfirmasi penerimaan pelunasan."
        );
      }

      // Update to CONFIRMED atomically
      await tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      // Write immutable audit log
      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "SETTLEMENT",
          entityId: settlementId,
          action: "CONFIRM_SETTLEMENT",
          actorUserId: user.id,
          metadata: {
            amount: settlement.amount.toString(),
            confirmedAt: new Date().toISOString(),
          },
        },
      });

      return { alreadyConfirmed: false };
    });

    revalidatePath("/balances");
    revalidatePath("/settlements");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengonfirmasi pelunasan";
    return { success: false, error: message };
  }
}

/**
 * Rejects a settlement transfer (e.g. transfer not received or wrong amount).
 */
export async function rejectSettlementAction(
  input: RejectSettlementInput
): Promise<SettlementActionResult> {
  try {
    const validated = rejectSettlementSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: "Input penolakan tidak valid" };
    }

    const { householdId, settlementId, reason } = validated.data;
    const { user, membership: actorMembership } = await requireHouseholdMember(householdId);

    await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findFirst({
        where: { id: settlementId, householdId },
      });

      if (!settlement) {
        throw new Error("Data pelunasan tidak ditemukan");
      }

      if (settlement.status === SettlementStatus.CONFIRMED) {
        throw new Error(
          "Pelunasan yang sudah dikonfirmasi tidak dapat ditolak. Buat transaksi penyesuaian jika ada kekeliruan."
        );
      }

      if (
        settlement.payeeMemberId !== actorMembership.id &&
        actorMembership.role !== Role.ADMIN
      ) {
        throw new AuthorizationError(
          "Hanya penerima dana atau Admin yang berhak menolak klaim pelunasan."
        );
      }

      await tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.REJECTED,
        },
      });

      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "SETTLEMENT",
          entityId: settlementId,
          action: "REJECT_SETTLEMENT",
          actorUserId: user.id,
          metadata: {
            reason: reason || "Ditolak oleh penerima dana",
          },
        },
      });
    });

    revalidatePath("/balances");
    revalidatePath("/settlements");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menolak pelunasan";
    return { success: false, error: message };
  }
}

