# Phase 25: Maintenance Photos & Stripe Dashboard - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Two independent features: (1) Tenants can attach photos when submitting maintenance requests and owners can view them in the detail page. (2) Owners can access their Stripe Express Dashboard via a login link from the Connect status page. No new database tables for photos -- use existing `maintenance_requests` with a photos column or a junction table. Stripe login link via Edge Function.

</domain>

<decisions>
## Implementation Decisions

### Maintenance Photo Upload (Tenant Side)
- Tenant can attach up to 5 photos when submitting a new maintenance request
- Use existing `Dropzone` component (already imported in `src/app/(tenant)/tenant/maintenance/new/page.tsx`)
- Use existing `useSupabaseUpload` hook from `src/hooks/use-supabase-upload.ts`
- Upload photos to Supabase Storage bucket `maintenance-photos` with path `{request_id}/{filename}`
- Photos uploaded after the maintenance request is created (need the request ID for the storage path)
- Store photo URLs/paths in a `maintenance_request_photos` table (id, maintenance_request_id, storage_path, filename, uploaded_by, created_at)
- Accepted file types: image/jpeg, image/png, image/webp
- Max file size: 5MB per photo

### Maintenance Photo Display (Owner Side)
- Replace stub in `src/components/maintenance/detail/photos-card.tsx` with real photo grid
- Display photos as thumbnail grid (2-3 columns)
- Click thumbnail to open lightbox/fullscreen view
- Show photo count in card header
- Empty state when no photos attached (keep current icon + message pattern)

### Stripe Express Dashboard Access
- Add "Open Dashboard" button to `src/components/connect/connect-account-status.tsx` (state `isOpeningDashboard` already exists)
- Button only visible when `charges_enabled` is true (account fully onboarded)
- Create Edge Function `stripe-login-link` that calls `stripe.accounts.createLoginLink(stripeAccountId)`
- Edge Function validates JWT, looks up `property_owners.stripe_account_id` for the authenticated user
- Frontend calls Edge Function, receives URL, opens in new tab via `window.open(url, '_blank')`
- Button shows loading spinner while fetching link

### Database Changes
- Create `maintenance_request_photos` table with RLS policies (tenant can insert own, owner can read for their properties)
- Create Supabase Storage bucket `maintenance-photos` with appropriate policies
- No changes needed for Stripe -- uses existing `property_owners.stripe_account_id`

### Claude's Discretion
- Exact lightbox implementation (dialog with image or dedicated lightbox component)
- Whether to add photo count badge to maintenance request list view
- Migration file naming and exact RLS policy structure
- Whether photos are deleted when maintenance request is deleted (CASCADE vs orphan)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Maintenance photos
- `src/app/(tenant)/tenant/maintenance/new/page.tsx` -- Tenant new request form (already has Dropzone imports)
- `src/components/maintenance/detail/photos-card.tsx` -- Stub component to replace with real photo grid
- `src/hooks/use-supabase-upload.ts` -- Supabase Storage upload hook
- `src/components/ui/file-upload/` -- File upload component system (dropzone, validation, progress)
- `src/components/ui/dropzone.tsx` -- Standalone dropzone component
- `src/types/file-upload.ts` -- File upload type definitions
- `src/hooks/api/use-tenant-maintenance.ts` -- Tenant maintenance hooks (create mutation)

### Stripe Connect
- `src/components/connect/connect-account-status.tsx` -- Connect status page (add dashboard button here)
- `src/hooks/api/use-stripe-connect.ts` -- Stripe Connect hooks (account, balance, onboarding)
- `supabase/functions/stripe-connect/index.ts` -- Existing Stripe Connect Edge Function
- `supabase/functions/_shared/errors.ts` -- errorResponse() pattern for Edge Functions

### Database
- `src/types/supabase.ts` -- Generated types (regenerate after migration)
- `supabase/migrations/` -- Migration directory

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Dropzone` + `useSupabaseUpload` -- complete file upload pipeline already exists and is imported in the maintenance form
- `photos-card.tsx` -- stub component ready to be replaced (Card with "Photo upload is not yet available")
- `connect-account-status.tsx` -- already has `isOpeningDashboard` state variable, just needs the button and Edge Function call
- `inspection-photo-upload.tsx` -- existing photo upload component for inspections (reference pattern)
- `file-upload-validation.ts` -- file validation utilities (mime type, size checks)
- `errorResponse()` from `_shared/errors.ts` -- standard Edge Function error pattern

### Established Patterns
- Supabase Storage upload: `useSupabaseUpload` hook with bucket name, path, allowed mime types, max file size
- Edge Functions: JWT auth, `errorResponse()`, `validateEnv()`, CORS headers
- Stripe Connect Edge Function already exists at `supabase/functions/stripe-connect/` -- can extend or create separate function
- RLS: owner reads via `owner_user_id` join, tenant inserts for own requests

### Integration Points
- Maintenance request create mutation -- need to upload photos after request creation
- Maintenance request detail page -- photos-card.tsx already rendered there
- Connect status component -- button placement already scoped
- `property_owners` table -- has `stripe_account_id` for login link generation

</code_context>

<specifics>
## Specific Ideas

- The new maintenance request form already imports Dropzone and useSupabaseUpload -- the upload UI scaffolding is partially in place
- The connect-account-status component already has `isOpeningDashboard` state -- just needs the button and API call
- These two features are completely independent and can be planned as separate parallel plans

</specifics>

<deferred>
## Deferred Ideas

- Adding photos to existing maintenance requests (edit flow) -- future enhancement
- Photo annotations/markup -- separate feature
- Deleting individual photos from a request -- could be v2
- Stripe Dashboard embedded iframe (instead of new tab) -- too complex, Stripe recommends external link

</deferred>

---

*Phase: 25-maintenance-photos-stripe-dashboard*
*Context gathered: 2026-03-18*
