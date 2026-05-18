# Security Policy

## Reporting a Vulnerability

**Do not report security vulnerabilities via public GitHub issues, pull requests, or comments.**

Use [GitHub's private vulnerability reporting](https://github.com/hudsor01/tenant-flow/security/advisories/new) instead.

Please include:
- Description of the vulnerability and its impact.
- Steps to reproduce (a minimal proof-of-concept is appreciated).
- Affected components or routes.
- Suggested fix or mitigation, if you have one.

You'll receive an acknowledgement within 2 business days. Resolution timelines depend on severity:

| Severity | Initial response | Fix target |
|---------|------------------|------------|
| Critical (RCE, auth bypass, data breach) | < 24 hours | < 7 days |
| High (privilege escalation, account takeover) | < 48 hours | < 14 days |
| Medium (information disclosure, CSRF, XSS in dashboard) | < 5 business days | < 30 days |
| Low (defense-in-depth, hardening) | Best effort | Triaged into roadmap |

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure) — please give us a reasonable window to ship a fix before any public discussion.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` (production at tenantflow.app) | ✅ |
| Anything else | ❌ |

There is no semver release train. Production tracks `main`; security fixes ship as soon as they pass the perfect-PR review gate.

---

## Security Posture

### Authentication and Authorization

- **Supabase Auth** with `@supabase/ssr` (cookie-based sessions; `getAll`/`setAll` pattern only).
- **Server-validated identity** via `getUser()` on every authenticated request path. `getSession()` is used only for reading the access-token string when constructing Bearer headers.
- **Row-Level Security** is the only access-control layer. Every table in `public` and `storage` has RLS enabled. The frontend never holds the service-role key.
- **Subscription gate** in `src/proxy.ts` blocks dashboard routes for users not in `subscription_status IN ('active', 'trialing')`.
- **Admin gate** via the `is_admin` boolean on `users`. Admin-only RPCs check `is_admin()` server-side; the column is locked from PostgREST writes (see "Privileged Column Lockdown" below).

### Privileged Column Lockdown (PR #676)

`public.users` had a known escalation surface where any authenticated user could `update({ is_admin: true })` or `update({ subscription_status: 'active' })` on their own row. Closed by:
1. `REVOKE UPDATE ON public.users FROM authenticated`.
2. `GRANT UPDATE (col1, col2, ...) TO authenticated` on a 10-column allowlist (profile fields only).
3. `BEFORE UPDATE` trigger `users_guard_self_update` (SECURITY INVOKER) that compares `to_jsonb(NEW) - allowed_cols` against `to_jsonb(OLD) - allowed_cols`; any privileged-column drift raises 42501.
4. `REVOKE INSERT, DELETE ON public.users FROM authenticated` to close the delete-then-insert escalation path.

### Storage RLS

Every storage bucket policy enforces folder-uuid → owner ID via `storage.foldername(name)`. Verified with integration tests in `tests/integration/rls/`.

### Edge Function Hygiene

- **Auth**: Bearer + `supabase.auth.getUser(token)`. Identity is never derived from the request body.
- **CORS**: fail-closed when `FRONTEND_URL` is unset.
- **Errors**: generic `{ error: 'An error occurred' }` to clients; full detail to Sentry + structured console.
- **Rate limiting**: Upstash sliding window. IP extraction prefers `cf-connecting-ip`, falls back to the *last* trusted `x-forwarded-for` segment (the first segment is attacker-controlled).
- **HMAC** verification on webhooks (Stripe + DocuSeal) using `crypto.subtle.timingSafeEqual` with length pre-check.
- **Stripe Checkout** validates `price_id` against an allowlist; arbitrary-price + promo-code bypass is closed.

### Build, CI, and Dependency Hygiene

- **Pre-commit:** gitleaks (secret scanning, push protection on), lockfile-verify, lint, typecheck, unit tests.
- **CI:** lint + typecheck + Next.js build + Playwright smoke + RLS integration tests on every PR; required status checks via branch protection on `main`.
- **Dependabot:** weekly scans; high/critical alerts auto-trigger Dependabot PRs. Resolved alerts to date: GHSA-w5hq-g745-h8pq (uuid), GHSA-qx2v-qp2m-jg93 (postcss), GHSA-v2v4-37r5-5v8g (ip-address).
- **Secret scanning** with push protection enabled at the GitHub repo level.
- **Branch protection** on `main`: required checks, force-push and deletion blocked, admin-bypass disabled.
- **No `auth-helpers-nextjs`** anywhere — only `@supabase/ssr`.

### Frontend Security

- **CSP** in `vercel.json`: `script-src 'self' 'unsafe-inline' (nonce TBD)`, `frame-ancestors 'none'`, HSTS with `preload`.
- **Markdown** rendering via `react-markdown` v9 + `rehype-raw` + `rehype-sanitize` (in that order).
- **Sentry session replay** is disabled (PR #730) — the integration's MutationObserver + IndexedDB persistence were implicated in Chrome 148 PartitionAlloc renderer crashes. Remaining Sentry PII surface is limited to error metadata that callers explicitly attach (e.g. `userId`/`pathname` in `proxy.ts` captures) plus the user-initiated feedback widget; passive DOM/canvas/input capture is gone. `beforeSend` scrubs auth headers + card-number patterns from every event.

### GDPR

- 30-day grace period via `deletion_requested_at` on `users`.
- `request_account_deletion()` SECURITY DEFINER RPC validates `auth.uid()` and the cron job `process_account_deletions()` uses `FOR UPDATE SKIP LOCKED` for race safety.
- `anonymize_deleted_user(uuid)` replaces PII with `[deleted]` placeholders while preserving financial records.

### Audit Trail

Major security work is reviewed via the perfect-PR gate (two consecutive zero-finding independent review cycles before merge). Migrations include rationale comments; the most recent comprehensive audit (2026-05-07) is captured across PRs #676 and #677. Routine verification queries are in [`scripts/verify-security-posture.md`](./scripts/verify-security-posture.md) — run them quarterly or after any migration that touches `public.users` grants, admin RPC grants, or storage policies.

---

## Out of Scope

- **Tenant authentication / portal** — TenantFlow is landlord-only by design. Anyone offering "tenant access" is misrepresenting the product.
- **Rent payment processing** — payment collection happens through whatever channels the landlord already uses; we don't custodian funds.
- **Self-hosted deployments** — production is a single hosted instance at `tenantflow.app`. Self-hosted instances permitted under [FSL-1.1-MIT](./LICENSE) are not within scope of this policy; users running their own instances are responsible for their own security posture, including applying upstream patches.
- **Forks / derivative works** — security reports are accepted only for the canonical hosted instance at `tenantflow.app` and the source as published in this repository.

---

## Hall of Fame

Researchers who report verified vulnerabilities will be credited here with their consent.

_(Empty — be the first.)_
