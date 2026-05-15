# TenantFlow

Property management platform for independent landlords and small property managers. Track properties, leases, tenants, maintenance, and financials without the complexity (or cost) of enterprise PMS.

**Production:** [tenantflow.app](https://tenantflow.app)

> [!IMPORTANT]
> TenantFlow is **landlord-only**. Tenants are records, not user accounts. There is no tenant portal, no rent-payment facilitation, and no tenant authentication. The platform helps landlords run their business; payment collection and tenant communication happen through whatever channels the landlord already uses.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TanStack Query / Form + Zustand |
| Backend | Supabase (PostgREST + RPCs + Edge Functions) |
| Database | Postgres 17 with RLS on every table |
| Payments | Stripe (Checkout + Subscriptions) |
| Document signing | DocuSeal |
| Monitoring | Sentry (Next.js SDK + source maps + tunnel route) |
| Hosting | Vercel (frontend), Supabase (backend), deploys from `main` only |
| Package manager | bun 1.3.x, Node 24.x |

Architecture is intentionally backend-light: the Next.js app talks to Supabase directly via PostgREST. There is no custom API server. Edge Functions (Deno) handle webhooks (Stripe, DocuSeal, Resend) and operations that need privileged access.

---

## Quick Start

```bash
# Clone
git clone https://github.com/hudsor01/tenant-flow.git
cd tenant-flow

# Install
bun install

# Environment
cp .env.example .env.local   # populate Supabase + Stripe keys

# Dev server (port 3050)
bun run dev
```

Common commands:

```bash
bun run dev                          # dev server (Turbopack, port 3050)
bun run typecheck                    # tsc --noEmit (strict mode + noUncheckedIndexedAccess)
bun run lint                         # eslint
bun run test:unit                    # Vitest unit tests
bun run test:integration             # RLS integration tests (hits prod, see below)
bun run test:e2e                     # Playwright E2E
bun run db:types                     # regenerate src/types/supabase.ts atomically
bun run validate:quick               # types + lint + unit
```

> [!WARNING]
> `bun run test:integration` authenticates synthetic test users against **production** Supabase via dual-client (ownerA/ownerB) JWTs. Use only the synthetic accounts (`e2e-owner-a@tenantflow.app`, `e2e-owner-b@tenantflow.app`) — never personal credentials. Supabase auth rate-limits at ~45 sign-ins/minute, so don't run the suite back-to-back without a cooldown.

---

## Architecture

- **Server Components by default.** `'use client'` only for hooks, event handlers, or browser APIs.
- **Server state** via TanStack Query with `queryOptions()` factories in `src/hooks/api/query-keys/`.
- **UI state** via Zustand (one store per domain).
- **Forms** via TanStack Form.
- **URL state** via nuqs.
- **Mutations** invalidate related query keys plus `ownerDashboardKeys.all`.
- **Soft delete:** properties use `status: 'inactive'`. List queries filter `.neq('status', 'inactive')`.
- **Pagination:** Supabase `count: 'exact'` — never `data.length`.
- **Stats:** consolidate into single RPCs (e.g. `get_maintenance_stats()`, `get_lease_stats()`).
- **Auth:** `getAll`/`setAll` Supabase cookie methods only. `getUser()` for server-validated identity; `getSession()` only when reading the access token for Bearer headers.

For the full developer contract (zero-tolerance rules, file conventions, RPC return-type mapping, naming, etc.), see [`CLAUDE.md`](./CLAUDE.md).

---

## Database

- **Migrations:** `supabase/migrations/YYYYMMDDHHmmss_description.sql`. Applied via Supabase MCP `apply_migration`.
- **RLS** on every table; the frontend never holds the service-role key.
- **Generated types:** `src/types/supabase.ts` — never edit manually; regenerate via `bun run db:types`.
- **Migration drift:** prod-applied timestamps from MCP may differ from local filenames; always reconcile via `mcp__supabase__list_migrations` after each apply.

`amount` columns store **dollars** as `numeric(10,2)`. Convert to cents only at the Stripe API boundary.

---

## CI

| Trigger | Jobs |
|---------|------|
| PRs to `main` | `checks` (lint + typecheck + Next.js build) + `e2e-smoke` (Playwright) + `rls-security` (integration tests against prod) |
| Push to `main` | Same set; deploys via Vercel auto-trigger |
| Weekly cron + `workflow_dispatch` | `rls-security` (independent of branch state) |

Doc-only PRs (`**.md`, `.planning/**`, `.vscode/**`, `docs/**`, `LICENSE`) are handled by a paired no-op workflow ([`.github/workflows/ci-cd-doc-only.yml`](./.github/workflows/ci-cd-doc-only.yml)) so required status checks remain satisfied without bypassing branch protection.

Pre-commit hooks (lefthook): gitleaks, lockfile-verify, lint, typecheck, unit tests in parallel. Pre-push: lockfile sync. Commit messages enforced via commitlint (Conventional Commits).

---

## Security

See [`SECURITY.md`](./SECURITY.md) for the full vulnerability disclosure process. The short version: report via [GitHub Security Advisories](https://github.com/hudsor01/tenant-flow/security/advisories/new), not public issues.

Routine security verification: paste the prompt in [`scripts/verify-security-posture.md`](./scripts/verify-security-posture.md) into a browser agent at the Supabase SQL editor to validate the audit-locked posture against current prod state.

---

## License

[FSL-1.1-MIT](./LICENSE) — [Functional Source License v1.1, MIT Future License](https://fsl.software/) © 2025-2026 Richard Hudson.

You may use, copy, modify, redistribute, and run the Software for any **Permitted Purpose** — including internal commercial use, non-commercial research and education, and professional services delivered to other licensees. You may **not** use the Software to offer a hosted product or service that substitutes for or competes with TenantFlow itself.

Each release auto-converts to the **MIT License** on the **second anniversary of its publication date**. After that date, that release is yours to use without restriction.

The hosted service at `tenantflow.app` is operated as a commercial SaaS by the copyright holder. For commercial licensing inquiries (e.g., embedding TenantFlow into a competing product), contact support@tenantflow.app.

---

## Contact

Issues and feature requests via GitHub Issues. Security: see [`SECURITY.md`](./SECURITY.md). Commercial / partnership inquiries: support@tenantflow.app.
