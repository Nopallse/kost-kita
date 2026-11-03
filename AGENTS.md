# KostKita — Workspace Agent Instructions

You are the engineering team responsible for building KostKita, a shared living finance management application.

## Product Overview
KostKita helps roommates manage shared expenses, personal expenses, payments, debts, and settlements.

The application must distinguish three financial concepts:
1. **Transaction**: What was purchased.
2. **Allocation**: Who is responsible for the expense.
3. **Payment**: Who actually paid.

Settlement represents reimbursement between household members.

## Locked Technology Stack
- **IDE**: Google Antigravity
- **Framework**: Next.js App Router
- **Language**: TypeScript (strict)
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Animation**: Motion
- **Forms**: React Hook Form
- **Validation**: Zod
- **State Management**: Zustand
- **Charts**: Recharts
- **Authentication**: Auth.js
- **Testing**: Vitest + Playwright
- **Deployment**: Vercel

Do not replace the database or ORM without approval.

## Core Business Rules

### Expense Types
- **SHARED**:
  - Expense is distributed among explicitly selected household members.
  - Supports equal and custom splits.
- **PERSONAL**:
  - Expense belongs entirely to one selected member.
- **CUSTOM**:
  - Expense is allocated manually among multiple members.

### Payment vs Responsibility
Never confuse payment with expense responsibility.
- Payment records represent actual money paid.
- Allocation records represent financial responsibility.

### Financial Formula
```
Net Balance = Total Paid - Total Responsibility
```
Adjust the result using confirmed settlements.
- **Positive**: Member should receive money (receivable).
- **Negative**: Member needs to pay money (payable).
- **Zero**: Balanced.

The sum of all household member balances must equal zero when all expenses are fully funded and the ledger is valid.

### Financial Integrity
- Never use floating-point arithmetic for money.
- Use integer IDR amounts with BigInt or an explicitly consistent Decimal strategy.
- Perform calculations on the server.
- Use Prisma transactions for financial mutations.
- Every item allocation must equal its subtotal.
- Every transaction total must equal the sum of its items.
- Shared expenses must support selected participants.
- Pending settlements must not affect balances.
- Only confirmed settlements affect balances.
- Support partial settlements.
- Preserve audit history.
- Never silently delete financial records.

## Architecture
- Use Next.js App Router.
- Prefer Server Components.
- Use Client Components only when necessary.
- Separate domain logic from UI components.
- Use Zod for server-side validation.
- Enforce household authorization on every operation.
- Keep financial calculations in domain/service modules.
- Use PostgreSQL transactions for multi-row financial changes.

## UI/UX Direction
Create an original premium fintech experience inspired by Anthropic's editorial design philosophy.

Characteristics:
- Minimalist.
- Clean.
- Warm neutral surfaces.
- Strong typography.
- Generous whitespace.
- Subtle borders.
- Muted green positive states.
- Restrained red and amber warning states.
- Responsive layouts.
- Accessible interactions.

Do not copy Claude branding, logos, or proprietary assets.
Avoid excessive gradients, glassmorphism, unnecessary decorations, and generic dashboard layouts.

## Development Workflow
1. Inspect the repository.
2. Understand the existing conventions.
3. Read the PRD and business rules.
4. Propose the architecture.
5. Design the database schema.
6. Implement in small milestones.
7. Write tests for financial logic.
8. Verify all acceptance criteria.
9. Update documentation.

Never claim completion without running the relevant checks.
Do not perform destructive database operations without explicit approval.

## Definition of Done
- Functional implementation.
- Server-side authorization.
- Validated inputs.
- Accurate financial calculations.
- Automated tests.
- Responsive and accessible UI.
- Loading, empty, error, and success states.
- Documentation updated.

