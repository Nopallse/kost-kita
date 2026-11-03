# KostKita Business Rules

## Financial Concepts
1. **Transaction**: What was purchased.
2. **Allocation**: Who is responsible.
3. **Payment**: Who actually paid.
4. **Settlement**: Reimbursement between members.

---

## Example Scenario
### Transaction:
- **Rice**: Rp100.000, Shared A/B equally.
- **Shampoo**: Rp40.000, Personal A.
- **Snack**: Rp30.000, Personal B.
- **Total Transaction**: Rp170.000.

**Payment:**
- A pays Rp170.000.
- B pays Rp0.

**Responsibility:**
- A: Rice (Rp50.000) + Shampoo (Rp40.000) = Rp90.000.
- B: Rice (Rp50.000) + Snack (Rp30.000) = Rp80.000.
- Sum Responsibility = Rp170.000.

**Net Calculation:**
- A: Total Paid (Rp170.000) - Total Responsibility (Rp90.000) = **+Rp80.000** (Receivable).
- B: Total Paid (Rp0) - Total Responsibility (Rp80.000) = **-Rp80.000** (Payable).

**Reconciliation:**
- Net A (+Rp80.000) + Net B (-Rp80.000) = **Rp0**.
- **Result:** B owes A Rp80.000.

---

## Rounding Rules
Equal split remainder must be distributed deterministically.

**Example:**
Rp100.000 divided by three participants:
- Base integer division: `floor(100.000 / 3) = 33.333`.
- Remainder: `100.000 - (33.333 * 3) = 1`.
- Remainder distribution (ordered deterministically by participant ID/index):
  - Member A: Rp33.334.
  - Member B: Rp33.333.
  - Member C: Rp33.333.
- Total allocations: Rp33.334 + Rp33.333 + Rp33.333 = Rp100.000 (Exact match).

---

## Settlement Rules
- Only `CONFIRMED` settlements affect balances.
- `PENDING` and `REJECTED` settlements have zero effect on ledger balances.
- Partial payments reduce outstanding debt proportionally.
- Settlement confirmation must be idempotent (cannot be confirmed twice).
- All financial operations must be auditable (no hard deletes of historical transactions; void operations generate reverse projections).
