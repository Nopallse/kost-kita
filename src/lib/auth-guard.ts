import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export class AuthorizationError extends Error {
  constructor(message: string = "Tidak memiliki hak akses") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Harap masuk terlebih dahulu") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export type AuthenticatedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/**
 * Ensures user is authenticated and returns session user with guaranteed id
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  return session.user as AuthenticatedUser;
}

/**
 * Ensures user is an active member of the given household
 */
export async function requireHouseholdMember(householdId: string) {
  const user = await requireAuth();

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId: user.id,
      },
    },
    include: {
      household: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!membership || !membership.isActive) {
    throw new AuthorizationError(
      "Anda bukan anggota aktif dari rumah tangga/kost ini."
    );
  }

  return { user, membership, household: membership.household };
}

/**
 * Ensures user is an ADMIN of the given household
 */
export async function requireHouseholdAdmin(householdId: string) {
  const { user, membership, household } = await requireHouseholdMember(householdId);

  if (membership.role !== Role.ADMIN) {
    throw new AuthorizationError(
      "Hanya Admin rumah tangga yang dapat melakukan aksi ini."
    );
  }

  return { user, membership, household };
}
