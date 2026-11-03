---
name: nextjs-feature
description: Workflow and standards for implementing end-to-end features in Next.js App Router for KostKita.
---

# Next.js Feature Development

For every feature:
1. Read the relevant PRD section.
2. Inspect the current architecture.
3. Define acceptance criteria.
4. Define TypeScript types.
5. Create Zod validation.
6. Implement domain logic.
7. Implement server-side authorization.
8. Implement database operations.
9. Build responsive UI.
10. Add automated tests.
11. Run lint and typecheck.
12. Update documentation.

Do not implement financial logic inside React components.
Never trust client-submitted financial totals.
