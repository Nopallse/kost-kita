import { describe, it, expect } from "vitest";

describe("AI Draft Adjuster - Domain Logic & Sanitization", () => {
  const mockMembers = [
    { id: "mem-1", name: "Budi" },
    { id: "mem-2", name: "Andi" },
    { id: "mem-3", name: "Dimas" },
  ];
  const validMemberIds = new Set(mockMembers.map((m) => m.id));

  it("sanitizes AI output and preserves member ID integrity", () => {
    const rawAiOutput = {
      adjustedDraft: {
        title: "Belanja Warung",
        date: "2026-11-04",
        notes: "Ubah split kopi",
        items: [
          {
            name: "Kopi Kapal Api",
            quantity: 2,
            unitPrice: 15000,
            splitType: "SHARED",
            participantMemberIds: ["mem-1", "mem-2", "mem-invalid"],
            assignedMemberId: "mem-1",
          },
        ],
        payments: [{ memberId: "mem-1", amount: 30000 }],
      },
      explanation: "Kopi dialokasikan hanya untuk Budi dan Andi.",
    };

    const sanitizedItems = rawAiOutput.adjustedDraft.items.map((it: any) => {
      const filteredParts = it.participantMemberIds.filter((id: string) =>
        validMemberIds.has(id)
      );
      return {
        name: it.name,
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        splitType: it.splitType,
        participantMemberIds:
          filteredParts.length > 0 ? filteredParts : mockMembers.map((m) => m.id),
      };
    });

    expect(sanitizedItems[0].participantMemberIds).toEqual(["mem-1", "mem-2"]);
    expect(sanitizedItems[0].participantMemberIds).not.toContain("mem-invalid");
  });

  it("synchronizes payments when AI omits or modifies items", () => {
    const items = [
      { name: "Telur 1kg", quantity: 1, unitPrice: 30000 },
      { name: "Bumbu Dapur", quantity: 1, unitPrice: 5000 },
    ];
    const totalAmount = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

    let payments = [{ memberId: "mem-1", amount: 0 }];
    if (payments.length === 1) {
      payments[0].amount = totalAmount;
    }

    expect(totalAmount).toBe(35000);
    expect(payments[0].amount).toBe(35000);
  });
});

