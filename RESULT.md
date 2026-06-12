# RESULT: InsForge credit and payments schema - 2026-06-12

## Background
- Request: use InsForge CLI to create a credit field.
- Request: create a new payments table with only the minimum needed fields.
- Prior inspection: no existing `credit` column and no app-owned `public.payments` table existed.
- Constraint: avoid modifying InsForge-managed schemas such as `auth` and the existing managed `payments` schema.

## Implementation
- **`migrations/20260612055742_add-credit-and-payments.sql`**: added `public.user_credits` with `user_id`, `credit`, `created_at`, and `updated_at`.
- **`migrations/20260612055742_add-credit-and-payments.sql`**: added minimal app ledger `public.payments` with user, credit amount, monetary amount/currency, status, provider, optional provider payment id, and timestamps.
- **RLS**: enabled row level security on both tables.
- **Access**: authenticated users can only `SELECT` their own rows; runtime `INSERT`, `UPDATE`, and `DELETE` privileges were revoked for `anon` and `authenticated`.
- **Indexes**: added user/date lookup indexes and a unique provider payment id index for webhook/idempotency safety.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Migration apply | `npx @insforge/cli db migrations up 20260612055742_add-credit-and-payments.sql` | Passed |
| Table existence | `information_schema.tables` query for `public.user_credits`, `public.payments` | Passed |
| Columns | `information_schema.columns` query | Passed |
| RLS policies | `pg_policies` query | Passed |
| Runtime grants | `information_schema.role_table_grants` query | Passed |
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |

## Lessons
- App credit state should live in `public` app-owned tables instead of altering InsForge-managed `auth.users`.
- The managed `payments` schema already exists for provider integration, so app-facing payment history should be explicitly schema-qualified as `public.payments`.

## Deployment
- Migration applied to linked InsForge project `La Musica`.
- Not deployed as a frontend release. Commit/push still required when ready.
