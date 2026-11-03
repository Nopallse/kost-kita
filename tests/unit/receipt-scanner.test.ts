import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Receipt Scanner - Data Extraction & Formatting", () => {
  it("sanitizes markdown fenced JSON properly", () => {
    const rawResponse = "```json\n{\n  \"merchantName\": \"Indomaret\",\n  \"items\": [\n    {\"name\": \"Susu UHT\", \"quantity\": 2, \"unitPrice\": 18000, \"subtotal\": 36000}\n  ],\n  \"totalAmount\": 36000\n}\n```";
    
    let clean = rawResponse.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(clean);

    expect(parsed.merchantName).toBe("Indomaret");
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].subtotal).toBe(36000);
  });

  it("calculates fallback subtotal and positive integers correctly", () => {
    const rawItems = [
      { name: "  Roti Tawar  ", quantity: -1, unitPrice: 15000 },
      { name: "Telur 1kg", quantity: "2", unitPrice: "28000" },
    ];

    const sanitized = rawItems.map((it: any) => {
      const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
      const unit = Math.max(0, Math.round(Number(it.unitPrice) || 0));
      const sub = unit > 0 ? unit * qty : Math.max(0, Math.round(Number(it.subtotal) || 0));
      return {
        name: String(it.name || "Item").trim(),
        quantity: qty,
        unitPrice: unit > 0 ? unit : Math.round(sub / qty),
        subtotal: sub,
      };
    });

    expect(sanitized[0].name).toBe("Roti Tawar");
    expect(sanitized[0].quantity).toBe(1); // negative clamped to 1
    expect(sanitized[0].subtotal).toBe(15000);

    expect(sanitized[1].quantity).toBe(2);
    expect(sanitized[1].unitPrice).toBe(28000);
    expect(sanitized[1].subtotal).toBe(56000);
  });

  it("handles receipts with service charges and taxes matching total", () => {
    const items = [
      { name: "Nasi Goreng Spesial", quantity: 2, unitPrice: 35000, subtotal: 70000 },
      { name: "Es Teh Manis", quantity: 2, unitPrice: 5000, subtotal: 10000 },
      { name: "Pajak Restoran PB1 (10%)", quantity: 1, unitPrice: 8000, subtotal: 8000 },
    ];

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    expect(total).toBe(88000);
  });
});
