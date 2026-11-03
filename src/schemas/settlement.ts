import { z } from "zod";

export const createSettlementSchema = z.object({
  householdId: z.string().min(1),
  payeeMemberId: z.string().min(1, "Anggota penerima dana wajib dipilih"),
  amount: z.coerce.number().min(1, "Nominal transfer pelunasan minimal Rp1"),
  notes: z.string().max(255).optional().nullable(),
  proofUrl: z.string().url("URL bukti transfer tidak valid").optional().nullable().or(z.literal("")),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;

export const confirmSettlementSchema = z.object({
  householdId: z.string().min(1),
  settlementId: z.string().min(1),
});

export type ConfirmSettlementInput = z.infer<typeof confirmSettlementSchema>;

export const rejectSettlementSchema = z.object({
  householdId: z.string().min(1),
  settlementId: z.string().min(1),
  reason: z.string().max(255).optional().nullable(),
});

export type RejectSettlementInput = z.infer<typeof rejectSettlementSchema>;

