# Prisma + Neon Rules

- Neon PostgreSQL is the approved database.
- Prisma is the approved ORM.
- Inspect installed Prisma version before configuring Neon integration.
- Use pooled connections for runtime where appropriate.
- Use direct connection for migrations where required.
- Keep credentials in environment variables.
- Never commit .env.
- Define explicit relations and constraints.
- Add indexes for household, transaction, member, and settlement queries.
- Scope household data in every server-side query.
- Use database transactions for financial mutations.
- Preserve financial audit history.
- Review migration SQL before applying.
- Never run destructive migrations without approval.
- Test migrations against a development database first.
