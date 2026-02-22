---
phase: 55-external-services-edge-functions-stirlingpdf-docuseal
plan: 02
subsystem: api
tags: [docuseal, edge-functions, supabase, leases, signatures, typescript]

# Dependency graph
requires:
  - phase: 55-01
    provides: generate-pdf Edge Function (server-to-server call used by docuseal Edge Function)
  - phase: 51-04
    provides: leases PostgREST migration and DB schema (docuseal_submission_id, owner_signed_at, tenant_signed_at columns)
provides:
  - supabase/functions/docuseal/index.ts — DocuSeal outbound Edge Function with 5 actions
  - All 5 signature mutations in use-lease.ts migrated from apiRequest to docuseal Edge Function
  - useSignedDocumentUrl reads from leases PostgREST (no apiRequest)
  - callDocuSealEdgeFunction helper pattern for secure Edge Function calls with JWT session token
affects: [55-03, docuseal-webhook, lease-signature-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - docuseal Edge Function action-dispatch pattern (matches stripe-connect)
    - callDocuSealEdgeFunction helper reads session JWT from supabase.auth.getSession()
    - Server-to-server Edge Function calls use SUPABASE_SERVICE_ROLE_KEY as Bearer token
    - Base64 PDF encoding: btoa(String.fromCharCode(...new Uint8Array(buffer)))
    - DocuSeal /api/submissions with embedded base64 document (no template_id dependency)

key-files:
  created:
    - supabase/functions/docuseal/index.ts
    - .planning/phases/55-external-services-edge-functions-stirlingpdf-docuseal/55-02-SUMMARY.md
  modified:
    - apps/frontend/src/hooks/api/use-lease.ts
    - apps/frontend/src/hooks/api/__tests__/use-lease.test.tsx

key-decisions:
  - "DocuSeal submission uses embedded base64 PDF (not public URL) — self-hosted k3s instance may not be reachable from DocuSeal's side"
  - "Service role client used for ALL DB operations in Edge Function — elevated privileges for lease record updates"
  - "sign-owner / sign-tenant actions update DB directly (no DocuSeal API call needed for recording signatures)"
  - "cancel action archives DocuSeal submission then resets lease to draft — order matters (archive first, then update)"
  - "callDocuSealEdgeFunction reads access_token from supabase.auth.getSession() — consistent with callStripeConnectFunction and callExportEdgeFunction patterns"
  - "Test suite updated: replaced apiRequest mock assertions with fetch mock assertions targeting /functions/v1/docuseal"
  - "useSignedDocumentUrl returns pending:{submissionId} when both parties have signed — full URL wired in Phase 55-03 webhook plan"
  - "generate-pdf server-to-server call uses SUPABASE_SERVICE_ROLE_KEY as Bearer (bypasses user JWT auth requirement in generate-pdf)"

patterns-established:
  - "callDocuSealEdgeFunction(action, payload) — async helper fetching JWT from getSession(), POSTing to /functions/v1/docuseal"
  - "Edge Function action dispatch: if (action === 'X') { ... } blocks (no switch — matches stripe-connect pattern)"
  - "Fail-fast on non-2xx: return 502 immediately, no retry (matches stripe-webhooks locked decision)"

requirements-completed:
  - EXT-02

# Metrics
duration: 35min
completed: 2026-02-22
---

# Phase 55-02: DocuSeal Outbound Edge Function Summary

**DocuSeal lease e-signature Edge Function (5 actions) live; all 5 signature mutations in use-lease.ts migrated from NestJS apiRequest to supabase/functions/docuseal with zero apiRequest calls remaining**

## Performance

- **Duration:** 35 min
- **Started:** 2026-02-22T01:00:00Z
- **Completed:** 2026-02-22T01:35:00Z
- **Tasks:** 2
- **Files modified:** 3 (created 1, modified 2)

## Accomplishments
- Created `supabase/functions/docuseal/index.ts` — 5 action handlers (send-for-signature, sign-owner, sign-tenant, cancel, resend) with JWT auth, DOCUSEAL_URL + DOCUSEAL_API_KEY env vars, X-Auth-Token header for DocuSeal API calls, and service role Supabase client for DB updates
- Migrated all 5 signature mutations in `apps/frontend/src/hooks/api/use-lease.ts` from `apiRequest()` to `callDocuSealEdgeFunction()` helper — zero apiRequest imports remain
- Migrated `useSignedDocumentUrl` from apiRequest to PostgREST query on leases table — reads `docuseal_submission_id`, `owner_signed_at`, `tenant_signed_at`
- Updated test suite to mock `fetch` globally and verify docuseal Edge Function calls by action name in request body

## Task Commits

Each task was committed atomically:

1. **Task 1: Create docuseal outbound Edge Function** - (feat: add docuseal Edge Function with 5 action handlers)
2. **Task 2: Migrate use-lease.ts signature mutations to Edge Function + useSignedDocumentUrl to PostgREST** - (feat: migrate lease signature mutations to docuseal Edge Function)

## Files Created/Modified
- `supabase/functions/docuseal/index.ts` — DocuSeal outbound Edge Function: JWT-authenticated, 5 action handlers, calls generate-pdf server-to-server, POSTs base64 PDF to DocuSeal /api/submissions, updates leases table via service role
- `apps/frontend/src/hooks/api/use-lease.ts` — Removed apiRequest import; added callDocuSealEdgeFunction helper; migrated 5 mutations and useSignedDocumentUrl
- `apps/frontend/src/hooks/api/__tests__/use-lease.test.tsx` — Updated mock setup (getSession, global fetch); updated test assertions for Edge Function calls

## Decisions Made
- DocuSeal submission uses embedded base64 PDF (not public URL) — self-hosted k3s DocuSeal cannot pull from Supabase Storage URLs easily; embedding is the cleaner approach
- Service role client used for ALL DB reads and writes inside the Edge Function — elevated privileges needed to update lease records regardless of which user triggered the action
- `sign-owner` and `sign-tenant` actions update DB directly without fetching submitter details from DocuSeal — simpler, fewer network calls, trust the caller
- `cancel` archives the DocuSeal submission first (fail-fast on error), then resets lease — order ensures DocuSeal is in consistent state before DB update
- `useSignedDocumentUrl` returns `pending:{submissionId}` when both parties have signed — the full signed document URL will be stored in the DB by the Phase 55-03 webhook handler when DocuSeal sends the completion webhook

## Deviations from Plan

None - plan executed exactly as written. Test file updates were required to align with the implementation change (apiRequest → fetch) per TDD guidance.

## Issues Encountered
- TypeScript strict mode: `fetchMock.mock.calls[0][1].body` typed as possibly undefined — fixed by restructuring test assertions to use `expect.objectContaining({ body: expect.stringContaining(...) })` inline
- Tests initially failed because `supabase.auth.getSession` wasn't mocked in the test client — added `getSession: supabaseAuthGetSessionMock` and `vi.stubGlobal('fetch', fetchMock)` to mock setup

## User Setup Required
**External services require manual configuration:**
- `DOCUSEAL_URL` — Base URL of self-hosted DocuSeal k3s instance (e.g. https://sign.thehudsonfam.com)
- `DOCUSEAL_API_KEY` — DocuSeal API token (Dashboard → API Tokens → Create token)
- Add both as Supabase Edge Function secrets: `supabase secrets set DOCUSEAL_URL=... DOCUSEAL_API_KEY=...`
- Configure webhook URL in DocuSeal dashboard: Settings → Webhooks → Add `{SUPABASE_URL}/functions/v1/docuseal-webhook` (wired in Phase 55-03)

## Next Phase Readiness
- Phase 55-03 (docuseal-webhook): Ready to implement the inbound webhook handler that records completion events, updates `owner_signed_at`/`tenant_signed_at`, stores signed document URLs, and flips lease status to active
- The `pending:{submissionId}` stub in `useSignedDocumentUrl` will be replaced with the actual signed document URL when Phase 55-03 is complete

---
*Phase: 55-external-services-edge-functions-stirlingpdf-docuseal*
*Completed: 2026-02-22*
