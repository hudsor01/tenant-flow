# Phase 25: Maintenance Photos & Stripe Dashboard - Research

**Researched:** 2026-03-18
**Domain:** Supabase Storage file uploads, Stripe Connect login links, RLS policies
**Confidence:** HIGH

## Summary

Phase 25 has two independent features: (1) maintenance request photo upload/display using existing Supabase Storage patterns, and (2) Stripe Express Dashboard access via login link. Both features have extensive existing scaffolding -- the tenant maintenance form already imports `Dropzone` and `useSupabaseUpload`, the connect status component already has `isOpeningDashboard` state and a stub `handleOpenDashboard`, and the Edge Function already follows the action-based routing pattern.

The primary technical work is: a new `maintenance_request_photos` table with RLS, a Storage bucket with policies, wiring the upload hook output into `maintenance_request_photos` records after request creation, replacing the `photos-card.tsx` stub with a real photo grid and lightbox, and adding a `login-link` action to the existing `stripe-connect` Edge Function.

**Primary recommendation:** Follow the `inspection_photos` table/RLS pattern exactly for `maintenance_request_photos`. Extend the existing `stripe-connect` Edge Function with a `login-link` action rather than creating a separate function.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Tenant can attach up to 5 photos when submitting a new maintenance request
- Use existing `Dropzone` component and `useSupabaseUpload` hook
- Upload to Supabase Storage bucket `maintenance-photos` with path `{request_id}/{filename}`
- Photos uploaded after the maintenance request is created (need request ID for storage path)
- Store photo URLs/paths in a `maintenance_request_photos` table (id, maintenance_request_id, storage_path, filename, uploaded_by, created_at)
- Accepted file types: image/jpeg, image/png, image/webp; max 5MB per photo
- Replace stub in `src/components/maintenance/detail/photos-card.tsx` with real photo grid
- Display photos as thumbnail grid (2-3 columns), click to open lightbox/fullscreen
- Add "Open Dashboard" button to `connect-account-status.tsx` (state `isOpeningDashboard` already exists)
- Button only visible when `charges_enabled` is true
- Create Edge Function action that calls `stripe.accounts.createLoginLink(stripeAccountId)`
- Frontend calls Edge Function, receives URL, opens in new tab via `window.open(url, '_blank')`

### Claude's Discretion
- Exact lightbox implementation (dialog with image or dedicated lightbox component)
- Whether to add photo count badge to maintenance request list view
- Migration file naming and exact RLS policy structure
- Whether photos are deleted when maintenance request is deleted (CASCADE vs orphan)

### Deferred Ideas (OUT OF SCOPE)
- Adding photos to existing maintenance requests (edit flow)
- Photo annotations/markup
- Deleting individual photos from a request
- Stripe Dashboard embedded iframe
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAINT-01 | Tenant can upload photos when submitting maintenance request | Existing `Dropzone` + `useSupabaseUpload` hook, `maintenance-photos` Storage bucket, `maintenance_request_photos` table with RLS |
| MAINT-02 | Owner can view maintenance request photos in detail view | Replace `photos-card.tsx` stub with photo grid + lightbox dialog, query `maintenance_request_photos` joined to request |
| STRIPE-01 | Owner can access Stripe Express Dashboard via login link from connect status page | Add `login-link` action to existing `stripe-connect` Edge Function using `stripe.accounts.createLoginLink()` |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.99.2 | Storage uploads, PostgREST queries | Already used for all data access |
| `stripe` | 20.4.0 | `accounts.createLoginLink()` in Edge Function | Already used in stripe-connect function |
| `react-dropzone` | (existing) | File drag-and-drop | Already wrapped by `useSupabaseUpload` |
| `lucide-react` | (existing) | Icons (Image, X, ZoomIn, ExternalLink) | Project standard icon library |

### No New Dependencies Required
Both features are implementable entirely with existing libraries. No new packages needed.

## Architecture Patterns

### Pattern 1: Photo Upload Flow (Two-Step: Create Request, Then Upload)
**What:** Create the maintenance request first to get the ID, then upload photos to Storage using that ID as path prefix, then insert `maintenance_request_photos` records.
**When to use:** Any time storage path depends on a parent record ID.

The current form already does this -- it constructs `photoUrls` from `upload.successes` before calling `createRequest.mutateAsync()`. However, the current implementation has a bug: it uploads photos to a flat `maintenance_requests/` path before the request exists, then passes URLs to the mutation. The CONTEXT.md decision says photos should use `{request_id}/{filename}` paths.

**Corrected flow:**
1. User selects photos in Dropzone (staged locally, NOT auto-uploaded)
2. User submits form -- mutation creates the `maintenance_requests` row, returns `id`
3. After successful creation, upload photos to `maintenance-photos/{request_id}/{uuid}.{ext}`
4. Insert `maintenance_request_photos` records with storage paths
5. On any upload failure, the request still exists (photos are optional enrichment)

```typescript
// In mutation onSuccess or sequential after mutateAsync:
const request = await createRequest.mutateAsync(requestData)
if (stagedFiles.length > 0) {
  // Upload each file to storage
  for (const file of stagedFiles) {
    const ext = file.name.split('.').pop() || 'jpg'
    const storagePath = `${request.id}/${crypto.randomUUID()}.${ext}`
    await supabase.storage.from('maintenance-photos').upload(storagePath, file)
    await supabase.from('maintenance_request_photos').insert({
      maintenance_request_id: request.id,
      storage_path: storagePath,
      file_name: file.name,
      uploaded_by: userId
    })
  }
}
```

### Pattern 2: Stripe Login Link (Extend Existing Edge Function)
**What:** Add a `login-link` action to the existing `stripe-connect` Edge Function.
**Why:** The function already handles auth, Stripe client init, and account lookup. Adding another action is trivial and follows the established pattern.

```typescript
// In stripe-connect/index.ts, add action handler:
if (action === 'login-link') {
  const { data: row, error: dbError } = await supabase
    .from('stripe_connected_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (dbError || !row) {
    return new Response(
      JSON.stringify({ error: 'No connected account found' }),
      { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }

  const loginLink = await stripe.accounts.createLoginLink(row.stripe_account_id as string)

  return new Response(
    JSON.stringify({ url: loginLink.url }),
    { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
  )
}
```

### Pattern 3: Photo Display with Lightbox (Dialog-Based)
**What:** Use shadcn `Dialog` for lightbox rather than adding a dedicated lightbox library.
**Why:** No new dependencies. The Dialog component is already in the project and handles focus trapping, escape key, overlay click.

```typescript
// Thumbnail grid with dialog lightbox
<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
  {photos.map(photo => (
    <button key={photo.id} onClick={() => setSelectedPhoto(photo)}>
      <img src={getPublicUrl(photo.storage_path)} alt={photo.file_name} className="..." />
    </button>
  ))}
</div>
<Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
  <DialogContent className="max-w-3xl">
    <img src={getPublicUrl(selectedPhoto?.storage_path)} ... />
  </DialogContent>
</Dialog>
```

### Pattern 4: maintenance_request_photos Table (Follow inspection_photos)
**What:** Mirror the `inspection_photos` table structure exactly.

```sql
create table public.maintenance_request_photos (
  id uuid primary key default gen_random_uuid(),
  maintenance_request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text not null default 'image/jpeg',
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now() not null
);
```

**CASCADE recommendation:** Use `ON DELETE CASCADE` for `maintenance_request_id` -- when a maintenance request is deleted, its photos should be cleaned up. This matches the `inspection_photos` pattern. Note: Storage objects are NOT automatically deleted by CASCADE -- a cleanup function or trigger would be needed for full cleanup, but that can be deferred.

### Anti-Patterns to Avoid
- **Storing photo URLs in a JSON column on maintenance_requests:** Breaks normalization, makes RLS harder, no foreign key constraints.
- **Auto-uploading before request creation:** Current form code uploads to a flat path before the request exists. Must change to stage files locally, then upload after request creation.
- **Creating a separate Edge Function for login-link:** Unnecessary when the existing `stripe-connect` function already handles auth and account lookup.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File drag-and-drop | Custom DnD handler | `useSupabaseUpload` + `Dropzone` | Already in project, handles validation |
| Image lightbox | Custom modal with image zoom | shadcn `Dialog` | Focus trapping, accessibility, escape key |
| Storage signed URLs | Manual URL construction | `supabase.storage.from().getPublicUrl()` | Handles bucket URL construction |
| Stripe login link | Manual API call | `stripe.accounts.createLoginLink()` | One-liner, returns URL directly |

## Common Pitfalls

### Pitfall 1: Upload Path Before Request ID Exists
**What goes wrong:** Current code uploads photos before request creation, using a flat path. Photos can't be associated with specific requests.
**Why it happens:** The `useSupabaseUpload` hook auto-uploads or is triggered before form submit.
**How to avoid:** Disable `autoUpload` (already false). Stage files locally, upload only after `mutateAsync` returns the request ID.
**Warning signs:** Photos in storage but no corresponding `maintenance_request_photos` rows.

### Pitfall 2: Storage Bucket RLS Policies
**What goes wrong:** Bucket exists but no storage policies -- uploads fail with 403.
**Why it happens:** Creating a storage bucket via migration doesn't auto-create policies.
**How to avoid:** Create storage policies in the same migration: authenticated users can upload to paths matching their tenant's requests, owners can read photos for their properties.
**Warning signs:** "new row violates row-level security policy" on storage upload.

### Pitfall 3: Public vs Private Storage Bucket
**What goes wrong:** Using a private bucket requires signed URLs that expire. Using public bucket exposes photos to anyone with the URL.
**How to avoid:** Use a **public** bucket (matches current code which constructs public URLs). Maintenance photos are not highly sensitive -- the UUID path provides security through obscurity. This matches the existing pattern in `new/page.tsx` which constructs public URLs.
**Alternative:** Private bucket + signed URLs if security is a concern, but adds complexity.

### Pitfall 4: Stripe Login Link Only Works for Express Accounts
**What goes wrong:** `createLoginLink` only works for Express/Standard accounts, not Custom accounts.
**Why it happens:** Different account types have different dashboard access patterns.
**How to avoid:** TenantFlow only creates Express accounts (confirmed in `stripe-connect` Edge Function: `type: 'express'`). This is safe.

### Pitfall 5: next/image Does Not Support Supabase Storage URLs Without Config
**What goes wrong:** `next/image` requires whitelisted domains in `next.config.ts`.
**How to avoid:** Either add the Supabase Storage domain to `images.remotePatterns` in next.config.ts, or use plain `<img>` tags (project CLAUDE.md already notes `next/image` doesn't support blob URLs -- use `<img>` for previews).

## Code Examples

### Storage Bucket Creation (Migration)
```sql
-- Create the storage bucket (must be done via Supabase Dashboard or SQL)
insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Authenticated users can upload maintenance photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'maintenance-photos');

create policy "Anyone can view maintenance photos"
on storage.objects for select
to authenticated
using (bucket_id = 'maintenance-photos');
```

### RLS Policies for maintenance_request_photos
```sql
-- Owner can view photos for their maintenance requests
create policy "owner_select_maintenance_photos"
on public.maintenance_request_photos for select
to authenticated
using (
  maintenance_request_id in (
    select id from public.maintenance_requests
    where owner_user_id = (select auth.uid())
  )
);

-- Tenant can view photos for their own requests
create policy "tenant_select_maintenance_photos"
on public.maintenance_request_photos for select
to authenticated
using (
  maintenance_request_id in (
    select id from public.maintenance_requests
    where tenant_id in (
      select id from public.tenants
      where user_id = (select auth.uid())
    )
  )
);

-- Tenant can insert photos for their own requests
create policy "tenant_insert_maintenance_photos"
on public.maintenance_request_photos for insert
to authenticated
with check (
  maintenance_request_id in (
    select id from public.maintenance_requests
    where tenant_id in (
      select id from public.tenants
      where user_id = (select auth.uid())
    )
  )
);
```

### Frontend: Getting Public URL
```typescript
const supabase = createClient()
function getPhotoPublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('maintenance-photos')
    .getPublicUrl(storagePath)
  return data.publicUrl
}
```

### Frontend: Stripe Dashboard Hook Addition
```typescript
// In use-stripe-connect.ts, add:
export function useStripeDashboardLinkMutation() {
  return useMutation({
    mutationKey: mutationKeys.stripeConnect.loginLink,
    mutationFn: async (): Promise<string> => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'login-link' },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (error) throw error
      return (data as { url: string }).url
    }
  })
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAINT-01 | Photo upload mutation stages files, uploads after request creation, inserts photo records | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-tenant-maintenance.test.ts` | Wave 0 |
| MAINT-02 | PhotosCard renders photo grid, handles empty state, opens lightbox on click | unit | `pnpm test:unit -- --run src/components/maintenance/detail/__tests__/photos-card.test.ts` | Wave 0 |
| STRIPE-01 | Dashboard link mutation calls Edge Function and returns URL | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-stripe-connect.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/api/__tests__/use-tenant-maintenance.test.ts` -- covers MAINT-01 mutation logic
- [ ] `src/components/maintenance/detail/__tests__/photos-card.test.ts` -- covers MAINT-02 display
- [ ] `src/hooks/api/__tests__/use-stripe-connect.test.ts` -- covers STRIPE-01 login link mutation

## Open Questions

1. **Storage bucket creation via migration vs dashboard**
   - What we know: Supabase storage buckets can be created via SQL `insert into storage.buckets` but storage policies are separate from table RLS
   - What's unclear: Whether the project creates storage buckets via migrations (no existing migration pattern found for bucket creation)
   - Recommendation: Create bucket + policies in migration SQL for reproducibility

2. **Photo cleanup on request deletion**
   - What we know: CASCADE will delete `maintenance_request_photos` rows, but NOT the actual files in Storage
   - What's unclear: Whether orphaned storage objects matter for this phase
   - Recommendation: Use CASCADE for DB rows; defer storage cleanup to a future phase (storage costs are minimal for orphaned photos)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `inspection_photos` table structure and RLS policies in migration `20260220110000`
- Existing codebase: `stripe-connect` Edge Function action pattern
- Existing codebase: `useSupabaseUpload` hook and `Dropzone` component
- Existing codebase: `connect-account-status.tsx` with `isOpeningDashboard` state

### Secondary (MEDIUM confidence)
- Stripe docs: `accounts.createLoginLink()` returns `{ url: string }` for Express accounts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new deps needed
- Architecture: HIGH - follows established patterns (inspection_photos, stripe-connect actions)
- Pitfalls: HIGH - based on actual codebase analysis (current upload flow bug, storage policy needs)

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no fast-moving dependencies)
