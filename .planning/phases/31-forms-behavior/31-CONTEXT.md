# Phase 31: Forms Behavior Correctness - Context

**Gathered:** 2026-07-09 (inline; the research agent kept hitting a spurious skill-injection glitch). All frontend except FORMFIX-02 (new edge function).
**Status:** Ready for planning
**Source:** 2026-07-02 bug hunt — FORMFIX-01..08.

<domain>
## Phase Boundary
Fix 8 form-behavior bugs: the unsaved-changes guard, contact-form send, a render loop, dropped field values, missing validators, and duplicate toasts. All frontend + ONE new edge function (FORMFIX-02 contact send). No DB migrations. Out of scope: the v7.0 FORM-09/10 typing migration (separate milestone — v8.0 fixes only the behavior bugs in those files).
</domain>

<decisions>
## Implementation Decisions

### FORMFIX-01 — unsaved-changes guard never arms (FRONTEND)
`src/hooks/use-unsaved-changes.ts` `useUnsavedChangesWarning(isDirty: boolean)` is CORRECT (useEffect on `[isDirty]`, beforeunload). The bug is at the CALL SITES: they pass a non-reactive `form.state.isDirty` SNAPSHOT (read once at render), so the boolean never updates as the user types → the guard never arms.
**LOCKED:** at each call site read dirty REACTIVELY from the TanStack Form store, e.g. `const isDirty = useStore(form.store, (s) => s.isDirty)` then `useUnsavedChangesWarning(isDirty)`. `useStore` subscribes → re-renders on dirty change → the hook's effect re-runs. Sites: `property-form.client.tsx:134`, `add-tenant-form.tsx:83` (grep every `useUnsavedChangesWarning(` + every `form.state.isDirty` passed to it; fix ALL).
**Verify:** typing in the property/add-tenant form arms the beforeunload guard; resetting/submitting disarms it.

### FORMFIX-02 — contact form sends nowhere (NEW EDGE FUNCTION + frontend)
`src/components/contact/contact-form.tsx:69-82` — the submit handler only `logger.info`s + sets the thank-you message; it NEVER transmits. No contact edge function exists (only `auth-email-send`, `resend-webhook`).
**LOCKED:** (a) create a new edge function `supabase/functions/send-contact-email/index.ts` following the repo conventions — `validateEnv` inside `Deno.serve`, `getCorsHeaders(req)` + `handleCorsOptions`, `rateLimit()` (unauthenticated → Upstash 10/min per IP, fail-open), `escapeHtml()` all user values in the email template, send via `_shared/resend`, `errorResponse()` (never raw err.message). (b) contact-form's submit invokes it (`supabase.functions.invoke("send-contact-email", { body })` or fetch), shows the thank-you ONLY on success, and surfaces a real failure message on error. (c) Deploy is OWNER-RUN (CLI-401) — flag as a residual.
**Verify:** submitting the contact form invokes the function; failure shows an error (not the thank-you); success shows the thank-you.

### FORMFIX-03 — use-form-progress render loop (FRONTEND)
`src/hooks/use-form-progress.ts:167` — the auto-save effect deps are `[deferredFormData, progress, isHydrated]`. `progress` is an object recreated each render (the whole `useFormProgress` return), so the effect fires every render → `saveProgress` → localStorage write → re-render → spin. The sibling restore effect (`[progress.data, progress.isLoading, isHydrated]`) can ping-pong with it.
**LOCKED:** depend on STABLE identities only — replace the `progress` object dep with `progress.saveProgress` + `progress.isLoading` (ensure `saveProgress` is a stable useCallback in its hook; memoize if not), and GUARD the save on an actual value change (skip if the serialized safeData equals the last saved). Ensure the restore effect runs once (hydration) and doesn't retrigger auto-save.
**Verify:** typing in the contact form does not spin renders / repeated localStorage writes (assert saveProgress fires once per real change).

### FORMFIX-04 — add-tenant "Property Assignment" dropped (FRONTEND)
`src/components/tenants/add-tenant-form.tsx:57` — the optional property/unit selection is collected in form state but omitted from the create-tenant mutation payload, so the association is never made.
**LOCKED:** when a property+unit is selected, create the intended association (a lease / `lease_tenants` link, whatever the app uses to bind a tenant to a unit) after/with the tenant create — not silently dropped. Determine the exact association mechanism from the tenant/lease mutations; if it requires a lease, follow the existing lease-create path. If the association is genuinely unsupported without a full lease, surface that instead of silently discarding. (Executor: confirm the mechanism before wiring.)
**Verify:** creating a tenant with a property/unit selected produces the association (visible on the tenant/unit).

### FORMFIX-05 — maintenance edit drops unit/tenant + no validators (FRONTEND)
`src/hooks/use-maintenance-form.ts:56,114` — the EDIT payload omits `unit_id`/`tenant_id` (so those changes don't persist), and `maintenanceRequestCreateSchema` isn't wired (empty title/description/unit → a raw PostgREST uuid error instead of field errors).
**LOCKED:** include `unit_id`/`tenant_id` in the edit payload; wire `maintenanceRequestCreateSchema` (Zod) so empty/invalid title/description/unit surface FIELD errors before the mutation.
**Verify:** editing a maintenance request saves unit/tenant changes; submitting empty title/description/unit shows field errors, not a raw uuid error.

### FORMFIX-06 — general settings drops fields (FRONTEND)
`src/components/settings/general-settings.tsx:76` — the update sends only `phone`, dropping Contact Email / Timezone / Language.
**LOCKED:** include Contact Email, Timezone, Language in the update payload (all editable fields persist).
**Verify:** editing each of the 4 fields and saving persists all of them.

### FORMFIX-07 — notification "Enable All" only email (FRONTEND)
`src/components/settings/notification-settings.tsx:63` — "Enable All Notifications" reads/writes only `email`, not sms/push/in-app.
**LOCKED:** the toggle reads "all on" from ALL channels and writes ALL channels (email/sms/push/in-app) it claims to control.
**Verify:** toggling "Enable All" flips every channel; it reflects "on" only when all are on.

### FORMFIX-08 — duplicate toast (FRONTEND)
Both the form's onSubmit AND the mutation's `createMutationCallbacks` (`src/hooks/create-mutation-callbacks.ts`) toast success/error, so lease + property create/update fire TWO toasts. `lease-form.tsx:88`, `property-form.client.tsx:221`.
**LOCKED:** keep the single source of truth in `createMutationCallbacks` (the mutation callback); REMOVE the form-level duplicate `toast.*` in lease-form + property-form onSubmit. Confirm no form relies on the form-level toast for a case the callback doesn't cover.
**Verify:** creating/updating a lease or property shows exactly ONE success (or error) toast.

### Claude's Discretion
- FORMFIX-03 exact stabilization (useCallback vs primitive deps).
- FORMFIX-04 association mechanism (verify against the tenant/lease mutations before wiring).
- FORMFIX-02 invoke mechanism (`supabase.functions.invoke` vs fetch) + the email template shape.
</decisions>

<canonical_refs>
## Canonical References
- `src/lib/forms/` (TanStack Form composition — `useStore`, `form.store`, `form.Subscribe`), `src/hooks/use-unsaved-changes.ts`, `src/hooks/use-form-progress.ts`, `src/hooks/create-mutation-callbacks.ts`.
- Edge conventions (CLAUDE.md "Edge Functions"): `_shared/` cors/resend/errors/env/escape-html/rate-limit; `validateEnv` inside `Deno.serve`; fail-closed CORS; `errorResponse()` never leaks err.message; rate-limit unauthenticated functions.
- `maintenanceRequestCreateSchema` (Zod, `src/lib/validation/`), the tenant/lease/maintenance mutation options in `src/hooks/api/`.
- Deploy: CLI functions deploy 401s → owner-run via `bun scripts/deploy-edge-functions.ts` (send-contact-email residual).
</canonical_refs>

<specifics>
## Interactions
- FORMFIX-01 + FORMFIX-08 both touch property-form.client.tsx + add-tenant/lease forms — coordinate (no same-wave files_modified overlap).
- FORMFIX-03 (use-form-progress) underlies FORMFIX-02's contact form (useFormWithProgress) — fix the loop so the contact send isn't spamming saves.
- FORMFIX-02 needs the new edge function BEFORE the frontend can invoke it (but the frontend can be written against the contract; deploy is owner-run).
</specifics>

<deferred>
## Deferred
- v7.0 FORM-09/10 typing migration (separate milestone).
- Anything not in FORMFIX-01..08.
</deferred>

---
*Phase: 31-forms-behavior*
