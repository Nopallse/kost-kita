# Product Requirement Document (PRD) — KostKita

## 1. Executive Summary
**KostKita** is a shared living finance management platform tailored for roommates, communal households, and boarding houses (*kost/kontrakan*). It solves the common friction points of shared living: opaque splits, mixed receipts (combining personal items with shared groceries), unclear repayment obligations, and awkward debt settlements.

Unlike generic expense splitters that blur payment and responsibility, KostKita enforces a strict double-entry-inspired ledger that decouples:
1. **Transaction**: What was purchased and total itemization.
2. **Allocation**: Who is financially responsible for each item.
3. **Payment**: Who disbursed the liquid cash.
4. **Settlement**: Verified reimbursement transfers between members.

---

## 2. Problem Statement & User Personas
### 2.1 The Problem
- **Mixed Receipts**: One roommate buys household groceries (shared detergent, trash bags) but also grabs personal shampoo and snacks. Existing apps force manual pre-calculations before entry.
- **Conflating Paid vs Responsible**: People confuse "I paid for this" with "I owe this".
- **Floating-point rounding errors**: Splitting odd amounts (e.g., Rp100.000 / 3) causes cents/rupiah leakage and untracked balances.
- **Unverified Reimbursements**: Someone says "I already transferred via QRIS", but without settlement confirmation, ledgers fall out of sync.

### 2.2 Target Personas
- **Household Admin / Kost Organizer**: Manages household membership, tracks utility bills (electricity/token listrik, Wi-Fi, water), and audits communal balance.
- **Contributing Roommate**: Buys supplies on behalf of the house, adds personal items to shared runs, needs clear visibility on net payables/receivables, and settles debts cleanly.

---

## 3. Product Vision & Principles
- **Editorial Financial Clarity**: Clean, calm, trustworthy aesthetic inspired by editorial typography and warm minimalism. No distracting casino-like gamification.
- **Mathematical Integrity**: 
  - Zero-sum balances (`Σ balances = 0` for fully funded households).
  - Explicit integer IDR arithmetic (`BigInt`).
  - Deterministic remainder distribution for equal splits.
- **Deterministic Auditability**: Immutable history; modifications and voids create auditable adjustment projections rather than silent row deletions.

---

## 4. Key Functional Requirements

### 4.1 Household & Member Management
- Create, join, and manage households.
- Multi-tenant isolation: Members can only read and write data within their active household.
- Role-based capabilities (Admin, Member).
- Unique invite codes / magic links for joining.

### 4.2 Multi-Item Financial Transactions
- **Header Level**: Date, Merchant/Description, Payer(s), Total Amount, Receipt Attachment, Status (`CONFIRMED`, `VOIDED`).
- **Item Level**: Item name, quantity, unit price, subtotal.
  - Total of all item subtotals must equal transaction total.
- **Allocation Types**:
  - `SHARED`: Split equally or by percentage/weights among an explicitly selected subset of members.
  - `PERSONAL`: 100% assigned to a single member.
  - `CUSTOM`: Exact IDR amounts assigned manually per member. Sum must equal the item subtotal.
- **Multiple Payers**: Support splitting the payment side if multiple roommates pitched in at checkout. Sum of payments must equal transaction total.

### 4.3 Ledger & Net Balance Engine
- Core formula:
  $$\text{Net Balance} = \sum \text{Paid} - \sum \text{Responsibility} \pm \text{Confirmed Settlements}$$
- Net Balance States:
  - Positive ($> 0$): Member is owed money (Receivable).
  - Negative ($< 0$): Member owes money (Payable).
  - Zero ($= 0$): Settled / Balanced.
- Remainder Rounding Algorithm:
  - If subtotal cannot be divided cleanly by $N$ members, deterministic distribution prioritizes earlier sorted member IDs or highest share.

### 4.4 Debt Simplification & Settlement Workflow
- **Settlement Lifecycle**:
  1. `REQUESTED` / `PENDING`: Sender logs a transfer with optional proof (QRIS/bank transfer slip). Balance does NOT change yet.
  2. `CONFIRMED`: Recipient acknowledges receipt. Balance updates atomically inside a database transaction.
  3. `REJECTED`: Recipient rejects unverified transfer. Balance remains unchanged.
- Partial settlements allowed (reduces outstanding debt proportionally).
- Idempotent confirmation prevents double-crediting.

### 4.5 Financial Dashboard & Reporting
- Summary KPIs:
  - Total Household Expense (current cycle/month).
  - Shared vs Personal breakdown.
  - Active user's Net Position (Receivable / Payable).
  - Member breakdown matrix (Who owes whom).
- Activity feed: Chronological ledger stream with visual tags (`Shared`, `Personal`, `Custom`, `Settlement`).
- Monthly spending analytics by category (Groceries, Utilities, Rent, Maintenance).

---

## 5. Non-Functional Requirements
- **Financial Accuracy**: Absolute integer precision (IDR). No JavaScript `Number` floating point math used in canonical calculations.
- **Server-Side Enforcement**: All allocations, authorizations, and formulas run and validate on Next.js Server Components / Actions with Zod schemas.
- **Security & Authorization**: Every query and mutation is scoped to `householdId` matching authenticated session.
- **Performance**: Server-rendered reads with optimized Prisma indexes on `(householdId, date)`, `(transactionId)`, and `(memberId)`.

---

## 6. Success Metrics
- 100% reconciliation accuracy (0 sum invariant on test suites).
- 0 floating-point rounding discrepancies.
- Fast transaction input flow (< 30 seconds for a multi-item receipt).
