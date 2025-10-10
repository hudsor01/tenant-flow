# TenantFlow Playwright Tests (2025 Edition)

This package contains the supported Playwright projects and test tiers for TenantFlow.

## Projects

| Project | Scope | Runs In | Command |
|---------|-------|---------|---------|
| `chromium` | Core smoke (homepage, login surface, health check, CTA). | CI + local | `pnpm test:e2e:chromium` |
| `public` | Same smoke coverage against public routes (no auth). | CI + local | `pnpm test:e2e:chromium-no-auth` |
| `mobile-chrome` | Mobile viewport regression of public smoke suite. | CI + local | `pnpm test:e2e:mobile-chrome` |
| `staging` | Authenticated staging smoke (dashboard login + health). | Staging pipeline + manual | `pnpm test:e2e:staging` |
| `prod` | Synthetic monitors (health, config). | Monitoring cron | `pnpm --filter @repo/e2e-tests exec playwright test --project=prod` |

Only the first three projects are enabled in CI. The `staging`/`prod` folders remain opt-in and require explicit environment flags before they run.

## Test Layout

```
apps/e2e-tests/tests/
├── health-check.spec.ts         # API + Supabase connectivity smoke
├── homepage.spec.ts             # Marketing/login surface assertions
├── notification-system-public.spec.ts # Header/CTA validation
├── pricing-signup-flow.spec.ts  # CTA href + static pricing content
├── staging/                     # Staging dashboard smoke + API checks
└── production/                  # (placeholder) production monitors
```

## Environment

Smoke suites rely on:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Staging project resolves credentials in this order:
- Base URL: `STAGING_BASE_URL` → `PLAYWRIGHT_BASE_URL` → `E2E_BASE_URL`
- Admin email: `STAGING_ADMIN_EMAIL` → `E2E_ADMIN_EMAIL`
- Admin password: `STAGING_ADMIN_PASSWORD` → `E2E_ADMIN_PASSWORD`

(`pnpm test:e2e:staging` sets `PLAYWRIGHT_INCLUDE_STAGING` automatically; no extra secrets are needed if the defaults already exist.)

## Commands

From repository root:

```bash
pnpm test:e2e:chromium          # Desktop smoke
pnpm test:e2e:chromium-no-auth  # Public smoke
pnpm test:e2e:mobile-chrome     # Mobile smoke
pnpm test:e2e:staging           # Authenticated staging smoke (requires staging creds)
```

Prod monitors remain manual:

```bash
pnpm --filter @repo/e2e-tests exec playwright test --config=playwright.config.ts --project=prod
```

## Lint & Typecheck

```
pnpm --filter @repo/e2e-tests lint
pnpm --filter @repo/e2e-tests typecheck
```

## Best Practices
- Keep specs deterministic; avoid reliance on dynamic Stripe data.
- For new flows, add staging-only specs under `tests/staging/` and gate them via the dedicated project.
- Use `test.step` to split logical assertions.
- Ensure selectors use `data-testid` or stable text content.
