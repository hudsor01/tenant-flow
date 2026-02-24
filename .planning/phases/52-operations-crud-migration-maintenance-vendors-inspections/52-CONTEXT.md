# Phase 52: Operations CRUD Migration — Maintenance, Vendors, Inspections - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate `use-maintenance.ts`, `use-vendor.ts`, and `use-inspections.ts` from `apiRequest()` to Supabase PostgREST direct calls. Delete the corresponding NestJS modules (maintenance, vendors, inspections + any orphaned sub-modules). Extend direct Supabase Storage upload to inspection photos (same pattern as property images). No new features — this is a migration phase.

</domain>

<decisions>
## Implementation Decisions

### Inspection Photo Uploads
- Upload directly to Supabase Storage (bypassing NestJS entirely) — same pattern as property images
- Bucket: Claude decides based on existing Storage setup (dedicated `inspection-photos` or existing bucket with path prefix)
- File types accepted: JPEG, PNG, WebP only (no PDF)
- Photos are optional per room — rooms can exist without photos
- Failed upload (Storage success + DB insert failure): Claude handles cleanup based on existing property images pattern
- Photo deletion: Claude decides whether to delete from Storage based on existing property images delete pattern

### NestJS Deletion Scope
- Delete all 3 modules: maintenance, vendors, inspections
- Also delete any orphaned sub-modules that become unreferenced after these 3 are gone
- Delete all unit test files for deleted modules (consistent with Phase 51)
- Dependency handling:
  - If an importer is a **test file**: delete it
  - If an importer is **production code**: refactor to align with the new PostgREST/Supabase architecture

### Vendor Assignment Flow
- Single vendor per maintenance request (multi-vendor is deferred to a future phase)
- Assigning a vendor: update `vendor_id` + set `status = 'assigned'` in a single PostgREST mutation
- Maintenance request status set:
  - `open` → new request, no vendor
  - `assigned` → vendor assigned
  - `in_progress` → vendor working on it
  - `needs_reassignment` → vendor was removed (wrong type, scope changed, etc.)
  - `completed` → work done
  - `cancelled` → request cancelled
- Unassigning a vendor sets status to `needs_reassignment` (not back to `open`) — preserves audit trail

### Inspection Sub-Resource Structure
- File organization: Claude decides based on file size and React 19 / Next.js 16 best practices (co-location vs splitting by domain)
- Completion validation: all rooms must be assessed before an inspection can be marked complete — enforce at mutation level
- Tenant-review mutations: migrate to PostgREST if pure DB operation; defer with `// TODO(phase-55)` if external service (DocuSeal/email) required
- Photos within rooms: same PostgREST + Storage pattern as inspection-level photos

### Claude's Discretion
- Storage bucket choice for inspection photos (dedicated vs shared with path prefix)
- Photo deletion Storage cleanup strategy (match property images pattern)
- Hook file organization for inspection sub-resources (React 19 / Next.js 16 aligned)
- Tenant-review deferral determination (based on whether external service is involved)

</decisions>

<specifics>
## Specific Ideas

- "Design for single vendor only" — no junction table, keep `vendor_id` on `maintenance_requests`
- Status set was expanded during discussion: `needs_reassignment` covers the case where a vendor arrives on-site and the job requires a different specialty (e.g., HVAC vs general contractor)
- Align sub-resource hook structure with React 19 and Next.js 16 official documentation and architectural guidance

</specifics>

<deferred>
## Deferred Ideas

- **Multi-vendor support** — multiple vendors on a single maintenance request (junction table `maintenance_request_vendors`). Noted as future phase.
- **Vendor type/specialty routing** — automatically matching vendor type (HVAC, electrician, plumber) to request category. Noted as future phase.
- **on_hold status** — discussed but not included in Phase 52 status set. Can be added later.

</deferred>

---

*Phase: 52-operations-crud-migration-maintenance-vendors-inspections*
*Context gathered: 2026-02-21*
