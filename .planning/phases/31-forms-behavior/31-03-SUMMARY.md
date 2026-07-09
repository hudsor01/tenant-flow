---
phase: 31-forms-behavior
plan: 03
subsystem: contact
tags: [edge-function, resend, contact-form, rate-limit, xss, supabase]
requires: []
provides:
  - send-contact-email edge function (unauthenticated, rate-limited, XSS-safe)
  - contact form transmits + gates thank-you on real success
affects:
  - supabase/functions/send-contact-email/index.ts
  - src/components/contact/contact-form.tsx
tech-stack:
  patterns:
    - "unauthenticated edge function mirroring newsletter-subscribe conventions"
    - "escapeHtml on every user value before HTML interpolation"
    - "thank-you gated on data.success === true from functions.invoke"
key-files:
  created:
    - supabase/functions/send-contact-email/index.ts
    - src/components/contact/__tests__/contact-form.test.tsx
  modified:
    - src/components/contact/contact-form.tsx
decisions:
  - "Destination inbox = sales@tenantflow.app (matches the address the /contact page displays as 'Email Us'; also the plan's example default)."
  - "From stays the fixed FROM_ADDRESS; the subject line carries the escaped subject; user input never sets From/Reply-To."
  - "Failure = error OR data.success !== true; a thrown user-facing message becomes submitError (rendered), thank-you is skipped."
metrics:
  tasks: 2
  commits: 2
  files: 3
  completed: 2026-07-09
---

# Phase 31 Plan 03: Contact Form Send (send-contact-email) Summary

The contact form now actually transmits: a new unauthenticated `send-contact-email` edge function (built on the exact newsletter-subscribe conventions) delivers the message to `sales@tenantflow.app` via Resend, and the form invokes it and shows the "Thank You" screen only on a real success — a failed or non-success send surfaces an error instead.

## Tasks

| Task | Requirement | Commit | What |
|------|-------------|--------|------|
| 1 | FORMFIX-02 | `e4c2f9b26` | New `supabase/functions/send-contact-email/index.ts`: `handleCorsOptions` early-return, 405 non-POST with `getCorsHeaders`, `rateLimit` 10/min per IP (fail-open) before any work, `validateEnv({required:["RESEND_API_KEY"],optional:[...]})` inside `Deno.serve`, server-side required-field + EMAIL_REGEX + length-bound validation (400 generic on invalid), `escapeHtml()` on every user value in the email HTML, `sendEmail` to `sales@tenantflow.app` with the fixed FROM, `errorResponse` 502 on send failure / 500 in catch (never raw err.message). |
| 2 | FORMFIX-02 | `61d668a57` | `contact-form.tsx` submit now `createClient().functions.invoke("send-contact-email", { body })`; thank-you shows ONLY on `data.success === true` with no error; failure throws a user-facing message routed to `submitError`; existing client-side validation still gates before invoking. TDD test file added. |

## Key Decisions

- **Destination inbox:** `sales@tenantflow.app`. This is the address the /contact page already presents under "Email Us", and it matches the plan's `to: [<business inbox, e.g. "sales@tenantflow.app">]` example. No new secret required.
- **Conventions matched to newsletter-subscribe exactly:** shared imports only (`../_shared/cors|env|errors|escape-html|rate-limit|resend`), `validateEnv` inside `Deno.serve`, fail-closed CORS, generic `{ error: ... }` responses. No new npm/deno packages.
- **Anti-injection (T-31-03-01):** name/email/subject/message/phone/company/type/urgency all pass through `escapeHtml()`; message newlines converted to `<br />` after escaping.
- **Anti-spoofing (T-31-03-02):** From is the fixed `TenantFlow <noreply@tenantflow.app>`; user input never sets From/Reply-To; email validated with EMAIL_REGEX server-side.
- **DoS (T-31-03-03):** `rateLimit(req, { maxRequests: 10, windowMs: 60000, prefix: "contact" })`.
- **Frontend failure semantics:** `error || result?.success !== true` is treated as failure so a 502/500 (or any non-success) never shows the thank-you.

## Deviations from Plan

None — plan executed as written. Discretionary choices (per CONTEXT "Claude's Discretion"): used `supabase.functions.invoke` (not raw fetch); a compact keyed-rows HTML template; typed the invoke result as `{ success?: boolean }` to avoid `any`.

## Tests

`src/components/contact/__tests__/contact-form.test.tsx` (4 tests, all green):
- Success (`{ data: { success: true } }`) → invoke called with the form body; thank-you heading shown.
- Invoke error (`{ error: {...} }`) → error surfaced, no thank-you.
- Non-success payload (`{ data: { success: false } }`) → treated as failure, no thank-you.
- Client-side validation failure (message too short) → invoke NOT called, no thank-you.

Notes: subject is a Radix Select driven via `getByRole("combobox")` + `findByRole("option")`; jsdom exposes no global `localStorage`, so the test installs a minimal in-memory stub (the form-progress hook's `clearProgress` is not try/catch-wrapped and would otherwise throw on the success path). The edge function (Deno) is not covered by `bun run typecheck` (root tsconfig excludes `supabase/functions`); correctness relies on matching the newsletter-subscribe analog + the convention grep gate.

`bun run test:unit -- src/components/contact/__tests__/contact-form.test.tsx` → 4 passed. Both commits passed the full pre-commit suite (typecheck + lint + ~102k-test unit run).

## Residual / Owner-Run

- **Deploy is OWNER-RUN (CLI-401):** the new function is written against the contract but not deployed. Owner runs `bun scripts/deploy-edge-functions.ts` (or deploys `send-contact-email` specifically). `RESEND_API_KEY` + `UPSTASH_REDIS_REST_URL/TOKEN` already exist in prod (used by newsletter-subscribe) — no new secrets. Until deployed, a live submit will surface the failure message (correct fail-safe behavior).

## Self-Check: PASSED

- `supabase/functions/send-contact-email/index.ts` — FOUND
- `src/components/contact/contact-form.tsx` — FOUND (modified)
- `src/components/contact/__tests__/contact-form.test.tsx` — FOUND
- Commit `e4c2f9b26` — FOUND
- Commit `61d668a57` — FOUND
