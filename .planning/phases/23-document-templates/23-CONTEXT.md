# Phase 23: Document Templates - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace stub toasts in `useTemplatePdf` (preview + export) and `useTemplateDefinition` (save) with real implementations that use the existing `generate-pdf` Edge Function and persist template field configurations to the database. Scope is limited to the existing document template pages -- no new template types.

</domain>

<decisions>
## Implementation Decisions

### PDF Preview & Export
- Wire `useTemplatePdf.handlePreview` to call `generate-pdf` Edge Function with `{ html }` mode
- Build HTML from template form state client-side, send to Edge Function, display PDF blob in existing iframe
- Wire `useTemplatePdf.handleExport` to same Edge Function, trigger download using blob pattern from Phase 22 (fetch → blob → createObjectURL → programmatic anchor click → revokeObjectURL)
- Preview shows in the existing `TemplatePreviewPanel` iframe (520px height, already built)
- Export downloads as `{template-name}.pdf`

### Template Definition Persistence
- Store custom template definitions (field configurations) in a new `document_template_definitions` table
- Columns: `id`, `owner_user_id`, `template_key` (e.g., 'lease', 'maintenance-request'), `custom_fields` (jsonb), `created_at`, `updated_at`
- RLS: owners can only read/write their own definitions
- Wire `useTemplateDefinition.save` to upsert definitions via PostgREST
- Wire `useTemplateDefinition` load to fetch from PostgREST on mount

### Template Scope
- All existing template types get preview/export: lease, maintenance-request, property-inspection, rental-application, tenant-notice
- Requirements DOC-01/DOC-02 mention "lease template" but the hook is shared -- wiring it once enables all templates
- DOC-03 (save template definitions) applies to all template types via the generic `template_key` column

### Claude's Discretion
- HTML template styling for PDF output (fonts, spacing, colors) -- should match TenantFlow branding
- Error states when StirlingPDF is unavailable (toast + retry button)
- Debounce timing for preview regeneration (currently set to 500ms, adjust if needed)
- Whether to show loading skeleton or spinner during PDF generation

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- the stubs clearly define the integration points. The blob download pattern from Phase 22 should be reused exactly.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTemplatePdf` hook (`src/app/(owner)/documents/templates/components/use-template-pdf.ts`): Stub with correct interface -- just needs body implementation
- `useTemplateDefinition` hook (`src/app/(owner)/documents/templates/components/template-definition.ts`): Stub with correct interface
- `TemplatePreviewPanel` component: Complete UI with Preview/Export buttons and iframe display
- `template-types.ts`: `TemplatePreviewOptions`, `BrandingInfo`, `CustomField`, `ClauseItem` types already defined
- `generate-pdf` Edge Function: Already supports `{ html }` mode with StirlingPDF, JWT-authenticated
- Phase 22 blob download pattern: Proven in `account-data-section.tsx` (fetch → blob → createObjectURL → anchor → revoke)

### Established Patterns
- Edge Function calls: `fetch(/functions/v1/generate-pdf)` with Bearer token from `getSession().access_token`
- PDF blob response: `Content-Type: application/pdf`, `Content-Disposition: attachment`
- PostgREST for CRUD: `.from('document_template_definitions').upsert()` pattern
- Query key factories: Need `documentTemplateKeys` in `src/hooks/api/query-keys/`

### Integration Points
- 5 template page components use `useTemplatePdf` -- all will work once the hook is wired
- `useTemplateDefinition` is used in template form components -- wiring it enables all save buttons
- New DB table needs migration + RLS policies
- Existing `generate-pdf` Edge Function needs no changes (HTML mode already works)

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 23-document-templates*
*Context gathered: 2026-03-11*
