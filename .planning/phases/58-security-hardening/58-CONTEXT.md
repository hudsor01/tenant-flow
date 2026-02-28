# Phase 58: Security Hardening - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 8 known security vulnerabilities in Edge Functions and frontend mutations: auth bypass (SEC-01), IDOR (SEC-02, SEC-03), CHECK constraint mismatch (SEC-04), undefined owner_user_id in mutations (SEC-05), PostgREST filter injection (SEC-06), CORS wildcard (SEC-07), and unpinned dependencies (SEC-08). No new features — hardening only.

</domain>

<decisions>
## Implementation Decisions

### Error responses (Edge Functions)
- Minimal error responses: generic `401 Unauthorized` or `403 Forbidden` with no details — prevents information leakage
- No descriptive messages like "you do not have access to this lease" — avoids confirming resource existence
- Frontend shows generic error toast: "Something went wrong. Please try again." — no security-specific messaging
- Failed webhook auth logged to Sentry as warning — no security audit table needed

### Webhook verification (DocuSeal)
- HMAC signature verification via `X-DocuSeal-Signature` header (not bearer token)
- Fail-closed: no valid signature = 401, no processing

### Search sanitization
- Silent strip of PostgREST filter operators — no user-visible feedback when characters are removed
- Centralized `sanitizeSearchInput()` shared utility — all 4 search inputs (properties, units, tenants, maintenance) use the same function
- 100-character max length enforced by the sanitizer
- Standardize debounce to 300ms across all 4 search inputs while touching them

### Mutation guard behavior
- Block mutation + error toast when `owner_user_id` is undefined: "Unable to save. Please refresh and try again." — form state preserved
- Sentry warning logged when guard triggers — track frequency of the edge case
- Submit buttons disabled until auth/owner_user_id confirmed loaded — proactive prevention
- No spinner for the disabled state — use subtle pulse/shimmer animation instead (users interpret spinners as indefinite wait and bounce)

### Claude's Discretion
- Most performant guard pattern: shared hook vs inline check — Claude picks based on existing mutation hook structure and performance characteristics
- Exact PostgREST operators to strip (research which operators are dangerous)
- CORS origin matching implementation details (SEC-07)
- Deno import map structure for dependency pinning (SEC-08)
- Stripe notification_type CHECK constraint values (SEC-04)

</decisions>

<specifics>
## Specific Ideas

- Auth loads in < 200ms typically, so disabled button state is brief — the loading indicator should communicate "momentary" not "indefinite"
- Shimmer/pulse rather than spinner — user explicitly flagged that spinners signal "this will never resolve" and cause bounces

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 58-security-hardening*
*Context gathered: 2026-02-26*
