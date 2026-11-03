import { describe, it, expect } from "vitest";
import {
  transactionItemSchema,
  transactionPaymentSchema,
  createTransactionSchema,
} from "@/schemas/transaction";

describe("Transaction Zod Validation Schemas", () => {
  it("validates a valid transaction with mixed items and payments", () => {
    const validData = {
      householdId: "h1",
      title: "Belanja Superindo",
      date: new Date(),
      items: [
        {
          name: "Beras",
          quantity: 1,
          unitPrice: 100000,
          splitType: "SHARED" as const,
          participantMemberIds: ["m1", "m2"],
        },
        {
          name: "Shampoo",
          quantity: 1,
          unitPrice: 40000,
          splitType: "PERSONAL" as const,
          assignedMemberId: "m1",
        },
      ],
      payments: [
        {
          memberId: "m1",
          amount: 140000,
        },
      ],
    };

    const result = createTransactionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects transaction with empty items array", () => {
    const invalidData = {
      householdId: "h1",
      title: "Belanja Kosong",
      items: [],
      payments: [{ memberId: "m1", amount: 50000 }],
    };

    const result = createTransactionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects item with negative price", () => {
    const invalidItem = {
      name: "Barang Minus",
      quantity: 1,
      unitPrice: -5000,
      splitType: "SHARED" as const,
    };

    const result = transactionItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });

  it("rejects payment with empty memberId", () => {
    const invalidPayment = {
      memberId: "",
      amount: 50000,
    };

    const result = transactionPaymentSchema.safeParse(invalidPayment);
    expect(result.success).toBe(false);
  });
});
