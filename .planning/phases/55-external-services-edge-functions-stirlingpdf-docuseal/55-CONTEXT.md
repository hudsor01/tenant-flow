# Phase 55: External Services Edge Functions — StirlingPDF & DocuSeal - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the NestJS StirlingPDF and DocuSeal service modules with Supabase Edge Functions that call the self-hosted k3s APIs directly. This phase delivers:
- `supabase/functions/generate-pdf` — calls StirlingPDF on k3s, streams PDF blob to browser
- `supabase/functions/docuseal` (or split) — handles template creation, signing-request initiation, and DocuSeal webhook completion events

NestJS PDF and DocuSeal modules will no longer be reachable from the frontend after this phase. End-to-end: PDF generation and lease e-signature flows work through Edge Functions only.

Notification emails and scheduling are out of scope — Phase 56/57.

</domain>

<decisions>
## Implementation Decisions

### PDF Delivery
- Stream the PDF blob directly from the Edge Function to the browser — immediate download, no Supabase Storage step
- Timeout: 30 seconds for StirlingPDF calls
- All reports in the financials section that currently have a "Download PDF" button are in scope (not just year-end)
- Format sent to StirlingPDF: **Claude's discretion** — pick whichever of StirlingPDF's API endpoints is cleanest (HTML-to-PDF or template-based JSON)
- Browser UX during generation: **Claude's discretion** — button spinner + auto-download, or toast pattern, whichever fits existing UI patterns

### DocuSeal Signing Flow
- Signing parties: **tenant + owner** — both must sign before lease is fully executed
- On DocuSeal completion webhook: three actions must occur atomically:
  1. Update signing status in DB
  2. Insert owner notification record (in-app notification)
  3. Flip `leases.status` from `pending_signature` → `active`
- DB schema for signing status: **Claude's discretion** — use whichever approach (columns on `leases` table vs. separate `lease_documents` table) fits the existing schema best
- Signing statuses tracked: **Claude's discretion** — model based on what DocuSeal webhooks actually emit (e.g. `pending`, `partially_signed`, `completed`, `declined`)

### Error Handling
- k3s unreachable for PDF or DocuSeal calls: **Claude's discretion** — pick fail-fast vs. single-retry based on what matches existing Edge Function patterns (Stripe webhooks pattern preferred)
- Timeout: 30 seconds for all k3s calls
- DocuSeal signing request failure (k3s down at submission time): **Claude's discretion** — return error or store `signature_failed` state, whichever fits existing lease mutation error handling

### Webhook Security
- DocuSeal webhook verification method: **Claude's discretion** — use whatever DocuSeal's webhook config actually supports (shared secret header preferred if available, then HMAC, then open endpoint with secret)
- JWT requirement on webhook endpoint: **Claude's discretion** — follow the same pattern used for the Stripe webhook Edge Function (likely open endpoint with payload verification)
- Single vs. separate Edge Functions for DocuSeal (outbound + inbound): **Claude's discretion** — follow the pattern used for Stripe (stripe-webhooks is separate from stripe-connect)

### Claude's Discretion
- StirlingPDF API format (HTML vs. JSON template)
- Browser loading UX (spinner vs. toast)
- DB schema for signing status (columns on leases vs. new table)
- Signing status values (match DocuSeal webhook payload)
- k3s error recovery strategy (fail-fast vs. single retry)
- DocuSeal webhook auth pattern (match Stripe webhook implementation)
- Single vs. split docuseal Edge Function

</decisions>

<specifics>
## Specific Ideas

- Both services are **self-hosted on k3s** — not cloud APIs. Edge Functions need the k3s base URL as a secret (e.g. `STIRLING_PDF_URL`, `DOCUSEAL_URL`).
- The Stripe webhook implementation (`supabase/functions/stripe-webhooks/index.ts`) should be used as the reference pattern for the DocuSeal webhook function — same structure, idempotency, security approach.
- PDF delivery is a streaming response — the Edge Function should return `Content-Type: application/pdf` with `Content-Disposition: attachment` so the browser triggers a download automatically.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 55-external-services-edge-functions-stirlingpdf-docuseal*
*Context gathered: 2026-02-22*
