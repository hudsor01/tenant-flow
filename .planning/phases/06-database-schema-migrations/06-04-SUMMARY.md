---
phase: 06-database-schema-migrations
plan: 04
subsystem: database
tags: [postgres, gdpr, anonymization, data-retention, documentation]

# Dependency graph
requires:
  - phase: 06-00
    provides: "GDPR anonymization test stubs"
  - phase: 06-01
    provides: "Consolidated trigger functions and schema constraints"
  - phase: 06-02
    provides: "Documents owner_user_id column and leases cleanup"
  - phase: 06-03
    provides: "Cron scheduling patterns for process_account_deletions"
---

## What was built

GDPR-compliant account deletion cascade and Phase 6 documentation.

## Key files

### key-files.created
- `supabase/migrations/20260306180000_gdpr_anonymize_cascade.sql` — GDPR anonymization function with tenant/owner paths, cron scheduling

### key-files.modified
- `CLAUDE.md` — Added Schema Conventions, Cron Jobs, GDPR Patterns, Data Retention sections

## Technical decisions

1. **Two deletion paths**: Tenant deletion anonymizes PII (replaces with `[deleted]`) while preserving payment/lease records. Owner deletion blocks if active leases or pending payments exist, otherwise soft-deletes properties.
2. **Request-then-process pattern**: `request_account_deletion()` sets `deletion_requested_at`, `process_account_deletions()` cron runs at 3:45 AM UTC with `FOR UPDATE SKIP LOCKED` for safe concurrent processing.
3. **Financial record preservation**: Payment amounts, dates, and lease references are never anonymized — only PII (names, emails, phone numbers) gets replaced.

## Deviations

None.

## Self-Check: PASSED
- [x] Migration file created with anonymize_deleted_user() function
- [x] Tenant path: PII anonymized, payments preserved
- [x] Owner path: blocks on active leases/pending payments
- [x] CLAUDE.md updated with Phase 6 conventions
- [x] Typecheck passes
