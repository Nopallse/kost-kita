import { describe, it, expect } from "vitest";
import {
  createHouseholdSchema,
  joinHouseholdSchema,
  updateHouseholdSchema,
  updateMemberRoleSchema,
} from "@/schemas/household";

describe("Household Domain & Validation Schemas", () => {
  describe("createHouseholdSchema", () => {
    it("validates a valid household input", () => {
      const result = createHouseholdSchema.safeParse({
        name: "Kost Griya Melati",
        currency: "IDR",
        nickname: "Andi",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Kost Griya Melati");
        expect(result.data.currency).toBe("IDR");
        expect(result.data.nickname).toBe("Andi");
      }
    });

    it("defaults currency to IDR if omitted", () => {
      const result = createHouseholdSchema.safeParse({
        name: "Kost Bintang",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe("IDR");
      }
    });

    it("rejects household names that are too short", () => {
      const result = createHouseholdSchema.safeParse({
        name: "A",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("minimal 2 karakter");
      }
    });

    it("rejects household names that are too long", () => {
      const result = createHouseholdSchema.safeParse({
        name: "A".repeat(51),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("maksimal 50 karakter");
      }
    });
  });

  describe("joinHouseholdSchema", () => {
    it("trims whitespace from invite code", () => {
      const result = joinHouseholdSchema.safeParse({
        inviteCode: "  ABC123XY  ",
        nickname: "Budi",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inviteCode).toBe("ABC123XY");
      }
    });

    it("rejects invite codes that are too short", () => {
      const result = joinHouseholdSchema.safeParse({
        inviteCode: "AB",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("tidak valid");
      }
    });
  });

  describe("updateMemberRoleSchema", () => {
    it("accepts valid ADMIN and MEMBER roles", () => {
      const adminRes = updateMemberRoleSchema.safeParse({
        householdId: "h1",
        memberId: "m1",
        role: "ADMIN",
      });
      expect(adminRes.success).toBe(true);

      const memberRes = updateMemberRoleSchema.safeParse({
        householdId: "h1",
        memberId: "m1",
        role: "MEMBER",
      });
      expect(memberRes.success).toBe(true);
    });

    it("rejects arbitrary invalid roles", () => {
      const result = updateMemberRoleSchema.safeParse({
        householdId: "h1",
        memberId: "m1",
        role: "SUPERUSER",
      });
      expect(result.success).toBe(false);
    });
  });
});
