# KostKita Development Roadmap

## Phase 0 — Foundation
- Initialize Next.js with App Router.
- Configure TypeScript (strict mode).
- Configure Tailwind CSS.
- Install and configure shadcn/ui.
- Configure Neon PostgreSQL connection.
- Configure Prisma ORM with connection pooling.
- Configure authentication with Auth.js.
- Establish editorial design system foundations.

## Phase 1 — Household
- Authentication flow (Sign up, login, session).
- Create household workspace.
- Member invitation system (invite codes / links).
- Member management & household role authorization.

## Phase 2 — Financial Engine
- Core math engine with integer BigInt IDR arithmetic.
- SHARED allocation logic with deterministic rounding.
- PERSONAL allocation logic.
- CUSTOM allocation logic.
- Multi-payer payment tracking.
- Net balance calculation engine.
- Comprehensive unit test suite with 100% boundary coverage.

## Phase 3 — Transactions
- Transaction list with filters (date, member, type).
- Transaction detail view with itemization breakdown.
- Multi-item transaction creation form with React Hook Form + Zod.
- Transaction edit flow with atomic ledger recalculation.
- Void transaction flow (audit preservation).
- Receipt attachment support.

## Phase 4 — Balance & Settlement
- Household balance matrix.
- Individual member balance cards.
- Debt simplification & tracking ("who owes whom").
- Settlement workflow (request with proof, confirm, reject).
- Support for partial settlements.
- Idempotency & concurrency guarantees in Prisma transactions.

## Phase 5 — Dashboard & Reports
- Editorial financial dashboard.
- Monthly household spending metrics.
- Shared vs personal analytics.
- Category spending reports with Recharts.
- CSV / Excel financial data export.

## Phase 6 — QA & Deployment
- End-to-end integration tests (Vitest + Playwright).
- Security and authorization boundary audit.
- Performance optimization (server-side caching, connection pooling).
- Production deployment on Vercel + Neon.
