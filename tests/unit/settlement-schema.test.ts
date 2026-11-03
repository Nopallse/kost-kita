import { describe, it, expect } from "vitest";
import {
  createSettlementSchema,
  confirmSettlementSchema,
  rejectSettlementSchema,
} from "@/schemas/settlement";

describe("Settlement Zod Validation Schemas", () => {
  it("validates a valid settlement request input", () => {
    const validData = {
      householdId: "h1",
      payeeMemberId: "m2",
      amount: 80000,
      notes: "Transfer QRIS BCA",
    };

    const result = createSettlementSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(80000);
      expect(result.data.payeeMemberId).toBe("m2");
    }
  });

  it("rejects non-positive settlement amounts", () => {
    const zeroAmount = {
      householdId: "h1",
      payeeMemberId: "m2",
      amount: 0,
    };
    expect(createSettlementSchema.safeParse(zeroAmount).success).toBe(false);

    const negativeAmount = {
      householdId: "h1",
      payeeMemberId: "m2",
      amount: -10000,
    };
    expect(createSettlementSchema.safeParse(negativeAmount).success).toBe(false);
  });

  it("validates confirm and reject settlement inputs", () => {
    const confirmInput = {
      householdId: "h1",
      settlementId: "s1",
    };
    expect(confirmSettlementSchema.safeParse(confirmInput).success).toBe(true);

    const rejectInput = {
      householdId: "h1",
      settlementId: "s1",
      reason: "Dana belum masuk rekening",
    };
    expect(rejectSettlementSchema.safeParse(rejectInput).success).toBe(true);
  });
});
