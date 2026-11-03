import { z } from "zod";

export const transactionItemSchema = z.object({
  name: z.string().min(1, "Nama barang wajib diisi").max(100),
  quantity: z.coerce.number().int().min(1, "Kuantitas minimal 1").default(1),
  unitPrice: z.coerce.number().min(0, "Harga satuan tidak boleh negatif"),
  splitType: z.enum(["SHARED", "PERSONAL", "CUSTOM"]).default("SHARED"),
  // If SHARED:
  participantMemberIds: z.array(z.string()).optional().default([]),
  // If PERSONAL:
  assignedMemberId: z.string().optional(),
  // If CUSTOM:
  customAllocations: z
    .array(
      z.object({
        memberId: z.string(),
        amount: z.coerce.number().min(0),
      })
    )
    .optional()
    .default([]),
});

export type TransactionItemInput = z.infer<typeof transactionItemSchema>;

export const transactionPaymentSchema = z.object({
  memberId: z.string().min(1, "Anggota pembayar wajib dipilih"),
  amount: z.coerce.number().min(0, "Nominal pembayaran tidak boleh negatif"),
});

export type TransactionPaymentInput = z.infer<typeof transactionPaymentSchema>;

export const createTransactionSchema = z.object({
  householdId: z.string().min(1),
  title: z.string().min(2, "Judul transaksi minimal 2 karakter").max(100),
  date: z.string().or(z.date()).default(() => new Date()),
  categoryId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(transactionItemSchema).min(1, "Minimal harus ada 1 item belanja"),
  payments: z
    .array(transactionPaymentSchema)
    .min(1, "Minimal harus ada 1 pencatat pembayaran"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
