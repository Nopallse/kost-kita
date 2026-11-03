"use server";

import { prisma } from "@/lib/db";
import { requireAuth, requireHouseholdAdmin, requireHouseholdMember, AuthorizationError } from "@/lib/auth-guard";
import {
  createHouseholdSchema,
  joinHouseholdSchema,
  updateHouseholdSchema,
  updateMemberRoleSchema,
} from "@/schemas/household";
import { nanoid } from "nanoid";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ActionState<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Creates a new household workspace and assigns creator as ADMIN
 */
export async function createHouseholdAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState<{ householdId: string }>> {
  try {
    const user = await requireAuth();

    const rawData = {
      name: formData.get("name"),
      currency: formData.get("currency") || "IDR",
      nickname: formData.get("nickname") || undefined,
    };

    const validated = createHouseholdSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || "Input tidak valid",
      };
    }

    const { name, currency, nickname } = validated.data;
    const inviteCode = nanoid(10).toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create household
      const household = await tx.household.create({
        data: {
          name,
          currency,
          inviteCode,
        },
      });

      // 2. Add creator as ADMIN
      const member = await tx.householdMember.create({
        data: {
          householdId: household.id,
          userId: user.id,
          role: Role.ADMIN,
          nickname: nickname || user.name || "Admin",
          isActive: true,
        },
      });

      // 3. Create AuditLog
      await tx.auditLog.create({
        data: {
          householdId: household.id,
          entityType: "HOUSEHOLD",
          entityId: household.id,
          action: "CREATE",
          actorUserId: user.id,
          metadata: {
            name,
            currency,
            adminMemberId: member.id,
          },
        },
      });

      return household;
    });

    revalidatePath("/dashboard");
    revalidatePath("/household");

    return {
      success: true,
      data: { householdId: result.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat rumah tangga";
    return { success: false, error: message };
  }
}

/**
 * Joins an existing household using an invite code
 */
export async function joinHouseholdAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState<{ householdId: string }>> {
  try {
    const user = await requireAuth();

    const rawData = {
      inviteCode: formData.get("inviteCode"),
      nickname: formData.get("nickname") || undefined,
    };

    const validated = joinHouseholdSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || "Kode undangan tidak valid",
      };
    }

    const { inviteCode, nickname } = validated.data;

    // Find household by inviteCode
    const household = await prisma.household.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!household) {
      return {
        success: false,
        error: "Rumah tangga dengan kode undangan tersebut tidak ditemukan.",
      };
    }

    // Check if user is already a member
    const existingMember = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: household.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      if (existingMember.isActive) {
        return {
          success: true,
          data: { householdId: household.id },
        };
      } else {
        // Reactivate membership
        await prisma.householdMember.update({
          where: { id: existingMember.id },
          data: { isActive: true },
        });

        revalidatePath("/dashboard");
        revalidatePath("/household");

        return {
          success: true,
          data: { householdId: household.id },
        };
      }
    }

    // Create new MEMBER
    await prisma.$transaction(async (tx) => {
      const newMember = await tx.householdMember.create({
        data: {
          householdId: household.id,
          userId: user.id,
          role: Role.MEMBER,
          nickname: nickname || user.name || "Anggota",
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          householdId: household.id,
          entityType: "MEMBER",
          entityId: newMember.id,
          action: "JOIN",
          actorUserId: user.id,
          metadata: {
            inviteCode,
          },
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/household");

    return {
      success: true,
      data: { householdId: household.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal bergabung ke rumah tangga";
    return { success: false, error: message };
  }
}

/**
 * Updates household info (requires ADMIN)
 */
export async function updateHouseholdAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const rawData = {
      householdId: formData.get("householdId"),
      name: formData.get("name"),
      currency: formData.get("currency") || "IDR",
    };

    const validated = updateHouseholdSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || "Input tidak valid",
      };
    }

    const { householdId, name, currency } = validated.data;
    const { user } = await requireHouseholdAdmin(householdId);

    await prisma.$transaction(async (tx) => {
      await tx.household.update({
        where: { id: householdId },
        data: { name, currency },
      });

      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "HOUSEHOLD",
          entityId: householdId,
          action: "UPDATE",
          actorUserId: user.id,
          metadata: { name, currency },
        },
      });
    });

    revalidatePath(`/household`);
    revalidatePath(`/dashboard`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui rumah tangga";
    return { success: false, error: message };
  }
}

/**
 * Regenerates a fresh invite code for the household (requires ADMIN)
 */
export async function regenerateInviteCodeAction(
  householdId: string
): Promise<ActionState<{ newInviteCode: string }>> {
  try {
    const { user } = await requireHouseholdAdmin(householdId);
    const newCode = nanoid(10).toUpperCase();

    await prisma.$transaction(async (tx) => {
      await tx.household.update({
        where: { id: householdId },
        data: { inviteCode: newCode },
      });

      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "HOUSEHOLD",
          entityId: householdId,
          action: "REGENERATE_INVITE_CODE",
          actorUserId: user.id,
          metadata: { newCode },
        },
      });
    });

    revalidatePath("/household");

    return { success: true, data: { newInviteCode: newCode } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kode undangan";
    return { success: false, error: message };
  }
}

/**
 * Updates a member's role (ADMIN vs MEMBER)
 */
export async function updateMemberRoleAction(
  householdId: string,
  targetMemberId: string,
  newRole: Role
): Promise<ActionState> {
  try {
    const { user, membership: actorMembership } = await requireHouseholdAdmin(householdId);

    // If demoting self from ADMIN to MEMBER, check that another ADMIN exists
    if (actorMembership.id === targetMemberId && newRole === Role.MEMBER) {
      const otherAdmins = await prisma.householdMember.count({
        where: {
          householdId,
          role: Role.ADMIN,
          isActive: true,
          id: { not: targetMemberId },
        },
      });

      if (otherAdmins === 0) {
        throw new AuthorizationError(
          "Tidak dapat mengubah peran: Harus ada setidaknya satu Admin aktif dalam rumah tangga."
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.householdMember.update({
        where: { id: targetMemberId },
        data: { role: newRole },
      });

      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "MEMBER",
          entityId: targetMemberId,
          action: "UPDATE_ROLE",
          actorUserId: user.id,
          metadata: { newRole },
        },
      });
    });

    revalidatePath("/household");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengubah peran anggota";
    return { success: false, error: message };
  }
}

/**
 * Deactivates or reactivates a member (requires ADMIN)
 */
export async function toggleMemberActiveAction(
  householdId: string,
  targetMemberId: string,
  setActive: boolean
): Promise<ActionState> {
  try {
    const { user } = await requireHouseholdAdmin(householdId);

    // If deactivating, ensure target is not the sole active admin
    if (!setActive) {
      const target = await prisma.householdMember.findUnique({
        where: { id: targetMemberId },
      });

      if (target?.role === Role.ADMIN) {
        const remainingAdmins = await prisma.householdMember.count({
          where: {
            householdId,
            role: Role.ADMIN,
            isActive: true,
            id: { not: targetMemberId },
          },
        });

        if (remainingAdmins === 0) {
          throw new AuthorizationError(
            "Tidak dapat menonaktifkan Admin satu-satunya di rumah tangga ini."
          );
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.householdMember.update({
        where: { id: targetMemberId },
        data: { isActive: setActive },
      });

      await tx.auditLog.create({
        data: {
          householdId,
          entityType: "MEMBER",
          entityId: targetMemberId,
          action: setActive ? "REACTIVATE_MEMBER" : "DEACTIVATE_MEMBER",
          actorUserId: user.id,
        },
      });
    });

    revalidatePath("/household");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status anggota";
    return { success: false, error: message };
  }
}
