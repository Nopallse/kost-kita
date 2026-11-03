import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z
    .string()
    .min(2, "Nama rumah tangga minimal 2 karakter")
    .max(50, "Nama rumah tangga maksimal 50 karakter"),
  currency: z.string().default("IDR"),
  nickname: z.string().max(30, "Nama panggilan maksimal 30 karakter").optional(),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

export const joinHouseholdSchema = z.object({
  inviteCode: z
    .string()
    .min(4, "Kode undangan tidak valid")
    .max(50, "Kode undangan terlalu panjang")
    .transform((val) => val.trim()),
  nickname: z.string().max(30, "Nama panggilan maksimal 30 karakter").optional(),
});

export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;

export const updateHouseholdSchema = z.object({
  householdId: z.string().min(1),
  name: z
    .string()
    .min(2, "Nama rumah tangga minimal 2 karakter")
    .max(50, "Nama rumah tangga maksimal 50 karakter"),
  currency: z.string().default("IDR"),
});

export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;

export const updateMemberRoleSchema = z.object({
  householdId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

