-- v2.4 Phase 61 — categorical taxonomy for public.documents.document_type.
--
-- Until now `document_type` was a freetext NOT NULL column without a
-- column-level default. v2.3 cycle-2 audit flagged owners cramming
-- browser MIME values into it; cycle-4 fixed that by adding a separate
-- mime_type column, but document_type remained freetext. Phase 61
-- closes that gap with a CHECK constraint enforcing seven categorical
-- values that match common landlord workflows (lease, receipt,
-- tax_return, inspection_report, maintenance_invoice, insurance,
-- other).
--
-- Defensive coercion: any row whose document_type isn't in the new
-- enum gets rewritten to 'other' BEFORE the constraint is added. Empty
-- table at migration time, but the UPDATE keeps the migration safe to
-- replay against any environment.

begin;

update public.documents
set document_type = 'other'
where document_type not in (
  'lease',
  'receipt',
  'tax_return',
  'inspection_report',
  'maintenance_invoice',
  'insurance',
  'other'
);

-- Idempotent ADD CONSTRAINT: project convention (see e.g.
-- 20260306130000_schema_constraints.sql). Bare `add constraint`
-- raises 42710 on replay, which would tear out a perfectly-good
-- schema during a `supabase db reset` after the constraint already
-- exists.
do $$
begin
  alter table public.documents
    add constraint documents_document_type_check
    check (document_type in (
      'lease',
      'receipt',
      'tax_return',
      'inspection_report',
      'maintenance_invoice',
      'insurance',
      'other'
    ));
exception when duplicate_object then null;
end
$$;

-- Make 'other' the column-level default so PostgREST inserts that omit
-- document_type get a valid taxonomy value (matches the application-
-- layer fallback in documentMutations.upload).
alter table public.documents alter column document_type set default 'other';

comment on column public.documents.document_type is
  'Categorical taxonomy. CHECK-enforced enum: lease | receipt | tax_return | inspection_report | maintenance_invoice | insurance | other. Default ''other''. Distinct from mime_type which stores browser-reported MIME.';

commit;
