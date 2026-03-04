# Agent Working Rules

- Work in small patches; do not rewrite the whole app.
- Respect monorepo: backend in `apps/api`, frontend in `apps/web`.
- Never hardcode secrets/domains/DB credentials; use environment variables.
- Keep existing routes working; add new routes without breaking behavior.
- Use MySQL transactions for writes that touch stock, invoices, or purchases.
- No hard deletes for invoices/stock movements; use VOID/STATUS semantics.
- Every new table must be org-scoped (`org_id`) and usually branch-scoped (`branch_id`).
- After each milestone, run:
  - API: `npm test` (if present), `npm run lint` (if present)
  - Web: `npm run build`
- At the end of changes, list all changed files with paths.
