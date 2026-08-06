-- =============================================================================
-- Phase 66 - Rental Application Intake: schema foundation.
--
-- (a) WHAT THIS PHASE IS
--     An owner generates a public tokenized application link for a vacant unit
--     and posts it to a rental listing. Applicants submit a standard rental
--     application with no account, no login and no SSN. The owner works them
--     through a status queue and converts an approved applicant into a tenant
--     record. Applicant PII gets a real retention path.
--
--     /apply/[token] is the product's ONLY public, write-capable surface.
--     Everything else in TenantFlow writes behind an authenticated session.
--     That makes this migration the place where the unauthenticated-internet
--     trust boundary is actually drawn: RLS alone is not the control, the
--     absence of any INSERT policy plus an explicit grant revoke is.
--
--     Positioning invariant, permanently out of scope: no applicant accounts,
--     no SSN, no screening, no background check, no credit pull, no
--     FCRA-regulated decisioning (APPLY-06).
--
-- (b) D-01 - THE LINK IS REUSABLE. THERE IS NO CONSUMED-AT COLUMN.
--     This table mirrors public.lease_signing_tokens
--     (20260617142623_token_based_lease_esignature.sql) in every respect except
--     one: lease_signing_tokens is a single-use credential and carries a
--     consumed-at stamp that sign_lease_with_token sets. A rental listing link
--     is the opposite by construction - one owner posts one link and many
--     strangers apply through it over a 60-day listing. A consumed-at stamp
--     here would break the product on the second applicant.
--
--     Dropping that column also drops the natural submission cap that came with
--     it, so submission_count exists to replace it (D-04a). The cap is enforced
--     inside the SECURITY DEFINER submit RPC under the token row's row lock,
--     which makes it fail-closed by construction. The Upstash limiter in
--     supabase/functions/_shared/rate-limit.ts deliberately fails OPEN when
--     Upstash is unreachable (:159), so it can only ever be the cheap outer
--     layer, never the gate.
--
-- (c) D-03a - raw_token IS STORED DELIBERATELY.
--     lease_signing_tokens stores only the SHA-256 hash and its own comment says
--     "the raw token is emailed once and never stored". This migration
--     deliberately REVERSES that decision, and the reversal is the correct one
--     for this token, not a weakening of the pattern:
--
--       - /sign's token is a secret credential held by exactly one tenant.
--         Confidentiality is its security property.
--       - This token is a link the owner PUBLISHES. It is pasted to Zillow, then
--         Craigslist, then Facebook, over a listing that runs for weeks.
--         UNGUESSABILITY is its security property, and 256 bits of entropy
--         provides that whether or not the raw value is at rest.
--       - Shown-once would force a rotation every time the owner needs the link
--         again, silently breaking every listing already posted. That trades a
--         guaranteed recurring failure against a hypothetical one.
--
--     RESIDUAL RISK, STATED PLAINLY RATHER THAN HIDDEN: a database leak exposes
--     links for units the owner has not yet posted publicly. The blast radius is
--     spam applications - bounded by the submission_count cap and the honeypot -
--     not data exfiltration, because the applications table is owner-scoped by
--     RLS and anon holds no grant on it. If that trade is ever rejected, the fix
--     is shown-once plus an explicit regenerate action, and the listing-breakage
--     cost moves to the owner.
--
--     token_hash is retained as the public lookup path so the unauthenticated
--     route never queries by a raw value.
--
-- (d) NULLABILITY NOTE - READ THIS BEFORE "TIGHTENING" ANYTHING.
--     Several of the nullable columns below are required on the form (phone,
--     move-in date, address, income, occupant count's siblings, reference 1).
--     They are nullable at the column level ONLY so
--     anonymize_old_rental_applications() (plan 66-05) can clear them.
--     Required-ness is enforced twice at write time - by the strict payload
--     validator in the Edge Function and again by an explicit null-check inside
--     submit_rental_application - and never by a NOT NULL constraint that would
--     make the retention sweep impossible. A reviewer who "tightens" these to
--     NOT NULL breaks APPLY-05.
--
--     The three NOT NULL PII columns (first name, last name, email) are
--     placeholder-compatible: the sweep overwrites them with '[deleted]', the
--     same mechanism anonymize_deleted_user() already uses
--     (20260720015620_retention_gdpr_and_writer_hardening.sql).
--
-- (e) HOW THIS FILE REACHES PRODUCTION.
--     This file is NOT applied by the plan that authors it. Plan 66-06 is the
--     single blocking, owner-gated apply step and runs it via Supabase MCP
--     apply_migration; the filename is then reconciled to the prod-assigned
--     timestamp returned by list_migrations. Authoring and applying are separate
--     on purpose: `bun run typecheck` and `next build` both pass against a stale
--     generated src/types/supabase.ts, so an unapplied migration looks fully
--     green. This project shipped three of them that way (v9.0, 2026-07-17).
-- =============================================================================

-- =============================================================================
-- 1. public.rental_application_links
--    One reusable public link per unit. Mirrors lease_signing_tokens minus the
--    single-use stamp (D-01/D-02), plus raw_token (D-03a) and submission_count
--    (D-04a).
-- =============================================================================
create table public.rental_application_links (
  id               uuid        primary key default gen_random_uuid(),
  -- A link pointing at a deleted unit is meaningless, so cascade is correct
  -- HERE and only here. The applications table takes the opposite policy.
  unit_id          uuid        not null references public.units (id) on delete cascade,
  owner_user_id    uuid        not null references public.users (id),
  -- SHA-256 hex of the raw token. This is the public lookup key: the
  -- unauthenticated route hashes the URL segment in TypeScript and looks the
  -- row up by hash, never by a raw value. Hashing happens in Deno, never in
  -- SQL - pgcrypto lives in the `extensions` schema on this project and a
  -- SECURITY DEFINER function pinned to `search_path = public` cannot reach
  -- digest() without schema-qualifying it (D-15).
  token_hash       text        not null unique,
  raw_token        text        not null,
  expires_at       timestamptz not null,
  revoked_at       timestamptz,
  -- The fail-closed cap counter (D-04a). Incremented under this row's lock
  -- inside the submit RPC, which is the only layer that cannot fail open.
  submission_count integer     not null default 0,
  created_by       uuid        not null references public.users (id),
  created_at       timestamptz not null default now()
);

comment on table public.rental_application_links is
  'One REUSABLE public application link per unit (D-01). Many applicants submit through the same token over a listing window, so there is deliberately no single-use consumption stamp - submission_count is the fail-closed cap counter instead (D-04a). token_hash is the public lookup key; raw_token is owner-readable (D-03a). Rows are created and revoked only by owner-gated SECURITY DEFINER RPCs (plan 66-04).';

comment on column public.rental_application_links.raw_token is
  'D-03a: the raw 256-bit link token, stored deliberately so the owner can re-copy the listing URL at any time. Unguessability is the security property here, not confidentiality - this link is published to Zillow, Craigslist and Facebook. Contrast public.lease_signing_tokens, whose raw token is a one-tenant secret and is never stored. Readable only by the owning user through the select policy below; anon holds no grant on this table.';

comment on column public.rental_application_links.submission_count is
  'Number of applications submitted through this link. The cap check in submit_rental_application reads and increments this under the token row lock, making it the only fail-closed abuse control (D-04a). The Upstash limiter fails open by design and is the outer layer, not the gate.';

-- =============================================================================
-- 2. public.rental_applications
--    The applicant-submitted row. Every column here is a retention liability the
--    moment it is written, which is why the sweep in plan 66-05 exists and why
--    the nullability note above is load-bearing.
-- =============================================================================
create table public.rental_applications (
  -- ---------------------------------------------------------------------------
  -- identity / linkage (retained by the anonymize stub)
  -- ---------------------------------------------------------------------------
  id                  uuid        primary key default gen_random_uuid(),
  owner_user_id       uuid        not null references public.users (id),
  link_id             uuid        references public.rental_application_links (id) on delete set null,
  -- NOT cascade. Units are hard-deletable (src/hooks/api/query-keys/unit-keys.ts
  -- exposes a delete mutation), and a cascade would destroy the landlord's own
  -- fair-housing evidence the moment they tidied up a unit. property_label and
  -- unit_label are denormalized text snapshots taken at submission precisely so
  -- the row still reads correctly after the unit is gone.
  unit_id             uuid        references public.units (id) on delete set null,
  property_label      text        not null,
  unit_label          text,
  -- Idempotency key minted by the client and echoed by the submit RPC, so a
  -- retried POST cannot create a second application.
  submission_id       uuid        not null unique,
  status              text        not null default 'new',
  decided_at          timestamptz,
  disposition_reason  text,
  -- D-09: the application row survives conversion and points at the tenant it
  -- became. Never cascade in either direction - deleting an application must not
  -- delete a tenant, and deleting a tenant must not erase the application.
  converted_tenant_id uuid        references public.tenants (id) on delete set null,
  converted_at        timestamptz,
  -- D-05 / F-3(b): household is a COUNT and nothing else. No ages, no names, no
  -- relationships. Familial status is a protected class and per-occupant detail
  -- invites exactly that inference.
  occupant_count      integer     not null,
  -- The UI-05 attestation timestamp: when the applicant certified the
  -- information is true. Survives anonymization as part of the decision record.
  certified_at        timestamptz not null,
  anonymized_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- ---------------------------------------------------------------------------
  -- PII, NOT NULL, placeholder-compatible. The retention sweep overwrites these
  -- with '[deleted]' rather than nulling them.
  -- ---------------------------------------------------------------------------
  applicant_first_name text not null,
  applicant_last_name  text not null,
  applicant_email      text not null,

  -- ---------------------------------------------------------------------------
  -- PII, NULLABLE so the retention sweep can clear them in place. See the
  -- NULLABILITY note in the header: many of these ARE required on the form. The
  -- form validator and the submit RPC enforce that, not the column definition.
  -- ---------------------------------------------------------------------------
  applicant_phone          text,
  desired_move_in_date     date,
  current_street           text,
  current_city             text,
  current_state            text,
  current_postal_code      text,
  current_landlord_name    text,
  current_landlord_phone   text,
  reason_for_moving        text,
  -- Income from ALL sources, in dollars (CLAUDE.md: numeric(10,2), never cents).
  -- Employer fields are OPTIONAL by design: requiring employment income as the
  -- primary signal is a source-of-income discrimination risk in CA, WA, NY and
  -- roughly twenty other jurisdictions, and 42 U.S.C. 3604(c) makes the
  -- application form itself a regulated surface (D-05).
  gross_monthly_income     numeric(10,2),
  employer_name            text,
  employer_role            text,
  employer_months          integer,
  other_income_source      text,
  other_income_amount      numeric(10,2),
  pet_details              text,
  vehicle_details          text,
  -- Named reference_N_* rather than a `references` column: `references` is a
  -- reserved SQL word.
  reference_1_name         text,
  reference_1_relationship text,
  reference_1_phone        text,
  reference_2_name         text,
  reference_2_relationship text,
  reference_2_phone        text,
  owner_notes              text,
  submitted_ip             text,
  submitted_user_agent     text,

  -- ---------------------------------------------------------------------------
  -- Named CHECK constraints. text + CHECK throughout, never a PostgreSQL ENUM
  -- (CLAUDE.md zero-tolerance rule 6).
  -- ---------------------------------------------------------------------------
  -- D-07 status vocabulary.
  constraint rental_applications_status_check
    check (status in ('new', 'reviewing', 'approved', 'rejected')),

  -- D-11d closed vocabulary. This is a FIXED LIST on purpose: it partially
  -- restores the defensibility the anonymized stub otherwise lacks, at
  -- negligible cost, and being closed means it can never itself become
  -- free-text PII that the retention sweep would then have to clear.
  constraint rental_applications_disposition_reason_check
    check (
      disposition_reason is null
      or disposition_reason in (
        'unit_no_longer_available',
        'income_requirement',
        'rental_history_requirement',
        'incomplete_application',
        'applicant_withdrew',
        'another_applicant_selected',
        'other'
      )
    ),

  constraint rental_applications_occupant_count_check
    check (occupant_count >= 1),

  -- F-1: the retention clock's integrity guard. The sweep ages rows from
  -- coalesce(decided_at, created_at), so a row that reached a terminal status
  -- without a decision timestamp would be aged from its SUBMISSION date and
  -- swept early - destroying the landlord's fair-housing defence before the
  -- 2-year federal window (42 U.S.C. 3613(a)(1)(A)) has even run.
  constraint rental_applications_decided_at_check
    check (status not in ('approved', 'rejected') or decided_at is not null)
);

comment on table public.rental_applications is
  'Rental application intake rows (Phase 66). Written only by the submit_rental_application SECURITY DEFINER RPC, called from the verify_jwt=false Edge Function; owners read via RLS and mutate through owner-gated RPCs (plan 66-04). Applicant PII columns are nullable or placeholder-compatible so the retention sweep can clear them in place. There is deliberately NO archive table (D-11c) - archiving would preserve verbatim the exact PII the sweep exists to remove.';

comment on column public.rental_applications.property_label is
  'Denormalized property name/address snapshot taken at submission. Exists so the row still reads correctly after the unit is hard-deleted, which is why unit_id is set-null rather than cascade.';

comment on column public.rental_applications.occupant_count is
  'Total household size as a COUNT ONLY (D-05, F-3(b)). No names, ages or relationships are collected anywhere in this schema: familial status is a protected class under the Fair Housing Act and per-occupant detail invites that inference.';

comment on column public.rental_applications.disposition_reason is
  'Closed-vocabulary decision reason (D-11d). Fixed list, never free text, so it survives anonymization without carrying PII.';

comment on column public.rental_applications.anonymized_at is
  'Set by anonymize_old_rental_applications() (plan 66-05) when the retention window elapses. NULL means the row still holds live applicant PII.';

-- =============================================================================
-- COLUMNS THAT MUST NOT EXIST. THIS IS A CONTRACT (D-06), NOT A PREFERENCE.
--
--   ssn / social security number, date of birth, government ID number,
--   driver's licence, passport, bank or card account details, routing numbers,
--   income TYPE classification, marital status, criminal history, and any
--   jsonb column holding per-occupant names, ages or relationships.
--
-- Every one of those raises the PII retention obligation, and the first several
-- are screening-shaped - which cuts directly against APPLY-06, the disclaimer
-- that keeps FCRA duties with the landlord rather than with TenantFlow.
-- Household is occupant_count and nothing else. A future migration adding any
-- of these is a positioning change, not a schema change, and needs an explicit
-- owner decision.
-- =============================================================================

-- =============================================================================
-- 3. Indexes
-- =============================================================================

-- The owner review queue's default ordering.
create index rental_applications_owner_created_idx
  on public.rental_applications (owner_user_id, created_at desc);

-- The queue's status filter tabs.
create index rental_applications_owner_status_idx
  on public.rental_applications (owner_user_id, status);

create index rental_applications_unit_idx
  on public.rental_applications (unit_id);

create index rental_applications_link_idx
  on public.rental_applications (link_id);

-- Keeps the nightly retention sweep bounded: it only ever scans rows that still
-- hold live PII and were never converted into a tenant.
create index rental_applications_retention_idx
  on public.rental_applications (created_at)
  where anonymized_at is null and converted_tenant_id is null;

create index rental_application_links_owner_idx
  on public.rental_application_links (owner_user_id);

create index rental_application_links_unit_idx
  on public.rental_application_links (unit_id);

-- =============================================================================
-- 4. updated_at trigger
--    public.set_updated_at() is the ONE updated_at trigger function in this
--    project (CLAUDE.md) and is never duplicated. Only rental_applications has
--    an updated_at column; rental_application_links is append-plus-revoke and
--    deliberately has neither the column nor a trigger.
-- =============================================================================
create trigger trg_rental_applications_updated_at
  before update on public.rental_applications
  for each row
  execute function public.set_updated_at();
