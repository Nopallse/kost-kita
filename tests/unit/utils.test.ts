import { describe, it, expect } from "vitest";
import { formatIDR, formatNetBalance } from "@/lib/utils";

describe("Fintech Utility & BigInt IDR Formatter", () => {
  it("formats integer IDR without floating point decimals", () => {
    expect(formatIDR(170000n)).toContain("170.000");
    expect(formatIDR(33334n)).toContain("33.334");
    expect(formatIDR(0n)).toContain("0");
  });

  it("formats net balance with proper signs and states", () => {
    const receivable = formatNetBalance(80000n);
    expect(receivable.isPositive).toBe(true);
    expect(receivable.isNegative).toBe(false);
    expect(receivable.formatted).toContain("+");
    expect(receivable.formatted).toContain("80.000");

    const payable = formatNetBalance(-80000n);
    expect(payable.isNegative).toBe(true);
    expect(payable.isPositive).toBe(false);
    expect(payable.formatted).toContain("-");
    expect(payable.formatted).toContain("80.000");

    const zero = formatNetBalance(0n);
    expect(zero.isZero).toBe(true);
    expect(zero.formatted).not.toContain("+");
    expect(zero.formatted).not.toContain("-");
  });
});

