import { describe, it, expect } from "vitest";
import {
  calculateItemSubtotal,
  createSharedAllocation,
  createPersonalAllocation,
  createCustomAllocation,
  distributeEquallyDeterministic,
  calculateHouseholdBalances,
  simplifyDebts,
  DomainTransaction,
  DomainSettlement,
  FinancialValidationError,
} from "@/lib/financial-engine";

describe("KostKita Financial Domain Engine", () => {
  // Test 1: Equal shared split
  it("Test 1: Equal shared split (clean integer division)", () => {
    // Rp90.000 split equally among A, B, C (3 participants) -> Rp30.000 each
    const allocations = createSharedAllocation(90000n, ["member-a", "member-b", "member-c"]);

    expect(allocations).toHaveLength(3);
    expect(allocations.find((a) => a.memberId === "member-a")?.amount).toBe(30000n);
    expect(allocations.find((a) => a.memberId === "member-b")?.amount).toBe(30000n);
    expect(allocations.find((a) => a.memberId === "member-c")?.amount).toBe(30000n);

    // Sum must equal 90.000
    const sum = allocations.reduce((acc, curr) => acc + curr.amount, 0n);
    expect(sum).toBe(90000n);
  });

  // Test 2: Personal expense
  it("Test 2: Personal expense (assigned 100% to one member)", () => {
    const allocations = createPersonalAllocation(40000n, "member-a");

    expect(allocations).toHaveLength(1);
    expect(allocations[0].memberId).toBe("member-a");
    expect(allocations[0].amount).toBe(40000n);
  });

  // Test 3: Custom allocation
  it("Test 3: Custom allocation (explicit amounts)", () => {
    // Rp100.000 explicitly allocated: A=60.000, B=40.000
    const allocations = createCustomAllocation(100000n, [
      { memberId: "member-a", amount: 60000n },
      { memberId: "member-b", amount: 40000n },
    ]);

    expect(allocations).toHaveLength(2);
    expect(allocations.find((a) => a.memberId === "member-a")?.amount).toBe(60000n);
    expect(allocations.find((a) => a.memberId === "member-b")?.amount).toBe(40000n);
  });

  // Test 4: Mixed items in one transaction (The Canonical KostKita Business Rule Example)
  it("Test 4: Mixed items in one transaction (Rice, Shampoo, Snack)", () => {
    /**
     * Header: Total = Rp170.000, A pays Rp170.000, B pays Rp0
     * Item 1: Rice Rp100.000, Shared A & B equally (A=50k, B=50k)
     * Item 2: Shampoo Rp40.000, Personal A (A=40k)
     * Item 3: Snack Rp30.000, Personal B (B=30k)
     * Responsibility: A=90.000, B=80.000
     * Net: A = +80.000, B = -80.000
     * Result: B owes A Rp80.000. Reconciles to 0.
     */
    const tx: DomainTransaction = {
      householdId: "h1",
      title: "Belanja Bulanan Supermarket",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 170000n,
      payments: [{ memberId: "member-a", amount: 170000n }],
      items: [
        {
          name: "Beras",
          quantity: 1,
          unitPrice: 100000n,
          subtotal: 100000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(100000n, ["member-a", "member-b"]),
        },
        {
          name: "Shampoo",
          quantity: 1,
          unitPrice: 40000n,
          subtotal: 40000n,
          splitType: "PERSONAL",
          allocations: createPersonalAllocation(40000n, "member-a"),
        },
        {
          name: "Snack",
          quantity: 1,
          unitPrice: 30000n,
          subtotal: 30000n,
          splitType: "PERSONAL",
          allocations: createPersonalAllocation(30000n, "member-b"),
        },
      ],
    };

    const report = calculateHouseholdBalances("h1", ["member-a", "member-b"], [tx]);

    expect(report.isReconciled).toBe(true);
    expect(report.discrepancy).toBe(0n);
    expect(report.totalHouseholdExpense).toBe(170000n);

    const posA = report.positions.get("member-a")!;
    expect(posA.totalPaid).toBe(170000n);
    expect(posA.totalResponsibility).toBe(90000n);
    expect(posA.netBalance).toBe(80000n);
    expect(posA.status).toBe("RECEIVABLE");

    const posB = report.positions.get("member-b")!;
    expect(posB.totalPaid).toBe(0n);
    expect(posB.totalResponsibility).toBe(80000n);
    expect(posB.netBalance).toBe(-80000n);
    expect(posB.status).toBe("PAYABLE");

    // Debt Simplification: B owes A Rp80.000
    const debts = simplifyDebts(report.positions);
    expect(debts).toHaveLength(1);
    expect(debts[0].fromMemberId).toBe("member-b");
    expect(debts[0].toMemberId).toBe("member-a");
    expect(debts[0].amount).toBe(80000n);
  });

  // Test 5: Multiple transactions aggregation
  it("Test 5: Multiple transactions aggregation over time", () => {
    // Tx 1: A pays Rp100.000 for electricity (Shared A & B equally: A=50k, B=50k)
    const tx1: DomainTransaction = {
      householdId: "h1",
      title: "Listrik",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 100000n,
      payments: [{ memberId: "member-a", amount: 100000n }],
      items: [
        {
          name: "Token Listrik",
          quantity: 1,
          unitPrice: 100000n,
          subtotal: 100000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(100000n, ["member-a", "member-b"]),
        },
      ],
    };

    // Tx 2: B pays Rp60.000 for Wi-Fi (Shared A & B equally: A=30k, B=30k)
    const tx2: DomainTransaction = {
      householdId: "h1",
      title: "Wi-Fi",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 60000n,
      payments: [{ memberId: "member-b", amount: 60000n }],
      items: [
        {
          name: "Tagihan Internet",
          quantity: 1,
          unitPrice: 60000n,
          subtotal: 60000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(60000n, ["member-a", "member-b"]),
        },
      ],
    };

    const report = calculateHouseholdBalances("h1", ["member-a", "member-b"], [tx1, tx2]);

    expect(report.isReconciled).toBe(true);
    expect(report.totalHouseholdExpense).toBe(160000n);

    // Member A: Paid 100k, Responsible 50k + 30k = 80k. Net = +20k
    const posA = report.positions.get("member-a")!;
    expect(posA.totalPaid).toBe(100000n);
    expect(posA.totalResponsibility).toBe(80000n);
    expect(posA.netBalance).toBe(20000n);
    expect(posA.status).toBe("RECEIVABLE");

    // Member B: Paid 60k, Responsible 50k + 30k = 80k. Net = -20k
    const posB = report.positions.get("member-b")!;
    expect(posB.totalPaid).toBe(60000n);
    expect(posB.totalResponsibility).toBe(80000n);
    expect(posB.netBalance).toBe(-20000n);
    expect(posB.status).toBe("PAYABLE");

    const debts = simplifyDebts(report.positions);
    expect(debts).toHaveLength(1);
    expect(debts[0].fromMemberId).toBe("member-b");
    expect(debts[0].toMemberId).toBe("member-a");
    expect(debts[0].amount).toBe(20000n);
  });

  // Test 6: Multiple payers in one transaction
  it("Test 6: Multiple payers in a single transaction", () => {
    // Total Rp150.000. A pitches in Rp100.000, B pitches in Rp50.000.
    // Item is shared equally: A=75k, B=75k.
    const tx: DomainTransaction = {
      householdId: "h1",
      title: "Galon Air Minum & Gas",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 150000n,
      payments: [
        { memberId: "member-a", amount: 100000n },
        { memberId: "member-b", amount: 50000n },
      ],
      items: [
        {
          name: "Perlengkapan Dapur",
          quantity: 1,
          unitPrice: 150000n,
          subtotal: 150000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(150000n, ["member-a", "member-b"]),
        },
      ],
    };

    const report = calculateHouseholdBalances("h1", ["member-a", "member-b"], [tx]);

    // A: Paid 100k, Responsible 75k -> Net +25k
    // B: Paid 50k, Responsible 75k -> Net -25k
    expect(report.positions.get("member-a")?.netBalance).toBe(25000n);
    expect(report.positions.get("member-b")?.netBalance).toBe(-25000n);
    expect(report.isReconciled).toBe(true);
  });

  // Test 7: Partial settlement
  it("Test 7: Partial settlement reduces outstanding debt proportionally", () => {
    // Initial: B owes A Rp80.000 (from Test 4)
    const tx: DomainTransaction = {
      householdId: "h1",
      title: "Belanja Bersama",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 160000n,
      payments: [{ memberId: "member-a", amount: 160000n }],
      items: [
        {
          name: "Sembako",
          quantity: 1,
          unitPrice: 160000n,
          subtotal: 160000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(160000n, ["member-a", "member-b"]),
        },
      ],
    };

    // B partially pays A Rp30.000 via confirmed settlement
    const settlement: DomainSettlement = {
      householdId: "h1",
      payerMemberId: "member-b",
      payeeMemberId: "member-a",
      amount: 30000n,
      status: "CONFIRMED",
    };

    const report = calculateHouseholdBalances(
      "h1",
      ["member-a", "member-b"],
      [tx],
      [settlement]
    );

    // Initial Net: A = +80.000, B = -80.000
    // After 30k confirmed settlement:
    // A received 30k -> Net is now +50.000 (still owed 50k)
    // B paid 30k -> Net is now -50.000 (owes 50k)
    const posA = report.positions.get("member-a")!;
    const posB = report.positions.get("member-b")!;

    expect(posA.netBalance).toBe(50000n);
    expect(posB.netBalance).toBe(-50000n);
    expect(report.isReconciled).toBe(true);

    const debts = simplifyDebts(report.positions);
    expect(debts[0].amount).toBe(50000n);
  });

  // Test 8: Pending settlement (Zero effect on balances)
  it("Test 8: Pending settlement has zero effect on ledger balances", () => {
    const tx: DomainTransaction = {
      householdId: "h1",
      title: "Belanja",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 100000n,
      payments: [{ memberId: "member-a", amount: 100000n }],
      items: [
        {
          name: "Sembako",
          quantity: 1,
          unitPrice: 100000n,
          subtotal: 100000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(100000n, ["member-a", "member-b"]),
        },
      ],
    };

    // Settlement is PENDING (e.g. transfer slip uploaded, but recipient hasn't confirmed)
    const pendingSettlement: DomainSettlement = {
      householdId: "h1",
      payerMemberId: "member-b",
      payeeMemberId: "member-a",
      amount: 50000n,
      status: "PENDING",
    };

    const report = calculateHouseholdBalances(
      "h1",
      ["member-a", "member-b"],
      [tx],
      [pendingSettlement]
    );

    // Net balance must remain completely unchanged!
    expect(report.positions.get("member-a")?.netBalance).toBe(50000n);
    expect(report.positions.get("member-b")?.netBalance).toBe(-50000n);
  });

  // Test 9: Rejected settlement (Zero effect on balances)
  it("Test 9: Rejected settlement has zero effect on ledger balances", () => {
    const tx: DomainTransaction = {
      householdId: "h1",
      title: "Belanja",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 100000n,
      payments: [{ memberId: "member-a", amount: 100000n }],
      items: [
        {
          name: "Sembako",
          quantity: 1,
          unitPrice: 100000n,
          subtotal: 100000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(100000n, ["member-a", "member-b"]),
        },
      ],
    };

    const rejectedSettlement: DomainSettlement = {
      householdId: "h1",
      payerMemberId: "member-b",
      payeeMemberId: "member-a",
      amount: 50000n,
      status: "REJECTED",
    };

    const report = calculateHouseholdBalances(
      "h1",
      ["member-a", "member-b"],
      [tx],
      [rejectedSettlement]
    );

    // Net balance must remain unchanged
    expect(report.positions.get("member-a")?.netBalance).toBe(50000n);
    expect(report.positions.get("member-b")?.netBalance).toBe(-50000n);
  });

  // Test 10: Transaction edit updates balances atomically
  it("Test 10: Transaction edit updates ledger projections accurately", () => {
    // Before edit: Total Rp100.000 (50k each)
    const txOriginal: DomainTransaction = {
      householdId: "h1",
      title: "Listrik",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 100000n,
      payments: [{ memberId: "member-a", amount: 100000n }],
      items: [
        {
          name: "Token Listrik",
          quantity: 1,
          unitPrice: 100000n,
          subtotal: 100000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(100000n, ["member-a", "member-b"]),
        },
      ],
    };

    const report1 = calculateHouseholdBalances("h1", ["member-a", "member-b"], [txOriginal]);
    expect(report1.positions.get("member-a")?.netBalance).toBe(50000n);

    // After edit: Total adjusted to Rp140.000 (70k each)
    const txEdited: DomainTransaction = {
      ...txOriginal,
      totalAmount: 140000n,
      payments: [{ memberId: "member-a", amount: 140000n }],
      items: [
        {
          name: "Token Listrik",
          quantity: 1,
          unitPrice: 140000n,
          subtotal: 140000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(140000n, ["member-a", "member-b"]),
        },
      ],
    };

    const report2 = calculateHouseholdBalances("h1", ["member-a", "member-b"], [txEdited]);
    expect(report2.positions.get("member-a")?.netBalance).toBe(70000n);
    expect(report2.positions.get("member-b")?.netBalance).toBe(-70000n);
    expect(report2.isReconciled).toBe(true);
  });

  // Test 11: Transaction void (Preserves audit history, zeroes balance impact)
  it("Test 11: Transaction void excludes transaction from active ledger", () => {
    const txVoided: DomainTransaction = {
      householdId: "h1",
      title: "Transaksi Dibatalkan",
      date: new Date(),
      status: "VOIDED",
      totalAmount: 200000n,
      payments: [{ memberId: "member-a", amount: 200000n }],
      items: [
        {
          name: "Barang Batal",
          quantity: 1,
          unitPrice: 200000n,
          subtotal: 200000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(200000n, ["member-a", "member-b"]),
        },
      ],
    };

    const report = calculateHouseholdBalances("h1", ["member-a", "member-b"], [txVoided]);

    // Active ledger must treat voided transactions as 0
    expect(report.totalHouseholdExpense).toBe(0n);
    expect(report.positions.get("member-a")?.netBalance).toBe(0n);
    expect(report.positions.get("member-b")?.netBalance).toBe(0n);
    expect(report.isReconciled).toBe(true);
  });

  // Test 12: Rounding remainder (Deterministic remainder distribution)
  it("Test 12: Deterministic remainder distribution for odd divisions", () => {
    // Rp100.000 divided by 3:
    // floor(100.000 / 3) = 33.333
    // remainder = 1
    // Member A (sorted first): 33.334
    // Member B: 33.333
    // Member C: 33.333
    const participants = ["member-c", "member-a", "member-b"]; // intentionally unsorted
    const allocations = distributeEquallyDeterministic(100000n, participants);

    const allocA = allocations.find((a) => a.memberId === "member-a")!;
    const allocB = allocations.find((a) => a.memberId === "member-b")!;
    const allocC = allocations.find((a) => a.memberId === "member-c")!;

    expect(allocA.amount).toBe(33334n);
    expect(allocB.amount).toBe(33333n);
    expect(allocC.amount).toBe(33333n);

    // Sum must equal 100.000 exact!
    const total = allocA.amount + allocB.amount + allocC.amount;
    expect(total).toBe(100000n);
  });

  // Test 13: Invalid allocation totals
  it("Test 13: Invalid allocation totals are rejected with validation errors", () => {
    // Case 1: Custom allocation sum != subtotal
    expect(() => {
      createCustomAllocation(100000n, [
        { memberId: "member-a", amount: 50000n },
        { memberId: "member-b", amount: 40000n }, // Sum is 90.000, not 100.000!
      ]);
    }).toThrowError(/Alokasi kustom tidak seimbang/);

    // Case 2: Transaction items sum != transaction totalAmount
    const invalidTxItems: DomainTransaction = {
      householdId: "h1",
      title: "Transaksi Rusak",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 100000n,
      payments: [{ memberId: "member-a", amount: 100000n }],
      items: [
        {
          name: "Item 1",
          quantity: 1,
          unitPrice: 80000n, // Subtotal 80k != totalAmount 100k
          subtotal: 80000n,
          splitType: "PERSONAL",
          allocations: createPersonalAllocation(80000n, "member-a"),
        },
      ],
    };

    expect(() => {
      calculateHouseholdBalances("h1", ["member-a"], [invalidTxItems]);
    }).toThrowError(FinancialValidationError);

    // Case 3: Transaction payments sum != transaction totalAmount
    const invalidTxPayments: DomainTransaction = {
      householdId: "h1",
      title: "Transaksi Kurang Bayar",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 100000n,
      payments: [{ memberId: "member-a", amount: 70000n }], // 70k != 100k
      items: [
        {
          name: "Item 1",
          quantity: 1,
          unitPrice: 100000n,
          subtotal: 100000n,
          splitType: "PERSONAL",
          allocations: createPersonalAllocation(100000n, "member-a"),
        },
      ],
    };

    expect(() => {
      calculateHouseholdBalances("h1", ["member-a"], [invalidTxPayments]);
    }).toThrowError(FinancialValidationError);
  });

  // Extra Test: Complex 4-person household zero-sum invariant check
  it("Extra: Complex 4-member multi-settlement zero-sum invariant", () => {
    const members = ["A", "B", "C", "D"];

    // Tx 1: A pays 200k shared by A, B, C, D equally (50k each)
    const tx1: DomainTransaction = {
      householdId: "h1",
      title: "Belanja Dapur",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 200000n,
      payments: [{ memberId: "A", amount: 200000n }],
      items: [
        {
          name: "Sembako",
          quantity: 1,
          unitPrice: 200000n,
          subtotal: 200000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(200000n, members),
        },
      ],
    };

    // Tx 2: B pays 120k for B and C only (60k each)
    const tx2: DomainTransaction = {
      householdId: "h1",
      title: "Makan Malam B & C",
      date: new Date(),
      status: "CONFIRMED",
      totalAmount: 120000n,
      payments: [{ memberId: "B", amount: 120000n }],
      items: [
        {
          name: "Makanan",
          quantity: 1,
          unitPrice: 120000n,
          subtotal: 120000n,
          splitType: "SHARED",
          allocations: createSharedAllocation(120000n, ["B", "C"]),
        },
      ],
    };

    // Settlement 1: C pays A 50k
    const s1: DomainSettlement = {
      householdId: "h1",
      payerMemberId: "C",
      payeeMemberId: "A",
      amount: 50000n,
      status: "CONFIRMED",
    };

    const report = calculateHouseholdBalances("h1", members, [tx1, tx2], [s1]);

    expect(report.isReconciled).toBe(true);
    expect(report.discrepancy).toBe(0n);

    // Sum of all net balances must equal 0n
    let sumNet = 0n;
    for (const pos of report.positions.values()) {
      sumNet += pos.netBalance;
    }
    expect(sumNet).toBe(0n);

    // Debt simplification resolves all outstanding amounts
    const debts = simplifyDebts(report.positions);
    expect(debts.length).toBeGreaterThan(0);

    const totalDebts = debts.reduce((acc, d) => acc + d.amount, 0n);
    const totalReceivables = Array.from(report.positions.values())
      .filter((p) => p.netBalance > 0n)
      .reduce((acc, p) => acc + p.netBalance, 0n);

    expect(totalDebts).toBe(totalReceivables);
  });
});

