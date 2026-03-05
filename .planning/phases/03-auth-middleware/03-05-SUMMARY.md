---
phase: 03-auth-middleware
plan: 05
status: complete
---

## Summary

Updated CLAUDE.md with Phase 3 auth & middleware conventions.

## Changes

| File | Change |
|------|--------|
| `CLAUDE.md` | Added proxy middleware docs, auth validation rules, authKeys factory, Resend auth emails |

## Key Additions to CLAUDE.md

1. **Security Model** — Updated to reflect proxy middleware route-level auth + user_type immutability
2. **Proxy Middleware section** — `proxy.ts` at root, `updateSession` utility, public routes, role-based enforcement
3. **Edge Functions** — JWT-only auth derivation, Resend auth email hook + templates
4. **Common Gotchas** — `getUser()` vs `getSession()` boundary, no module-level clients, unified `authKeys` factory

## Verification

- `pnpm validate:quick` — passes (typecheck + lint + 953 tests)
