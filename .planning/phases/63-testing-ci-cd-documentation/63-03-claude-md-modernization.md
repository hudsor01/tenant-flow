# Plan 63-03: CLAUDE.md Modernization

## Goal

Strip all NestJS/Railway/backend references from CLAUDE.md and add current Supabase-only architecture documentation: PostgREST query patterns, Edge Function patterns, and RLS-only security model.

## Current State

CLAUDE.md is already fairly clean — no NestJS references found in current content. However, it lacks:
- PostgREST query patterns
- Edge Function patterns
- RLS security model documentation
- The "Backend" line says "Supabase + Stripe" which is accurate but could be more detailed

## Changes

### Additions to CLAUDE.md

1. **Data Access Patterns** section:
   - PostgREST via `supabase.from()` — how to query, filter, paginate
   - RPC calls via `supabase.rpc()` for complex operations
   - Always use `.neq('status', 'inactive')` for soft-deleted tables

2. **Edge Functions** section:
   - Location: `supabase/functions/`
   - Shared code in `_shared/` (cors.ts, resend.ts)
   - Auth pattern: Bearer token -> `supabase.auth.getUser(token)`
   - CORS via `getCorsHeaders(req)` / `handleCorsOptions(req)`
   - Import map: `supabase/functions/deno.json`

3. **Security Model** section:
   - RLS enforced on all tables — no service role from frontend
   - `auth.uid()` in subselect for performance: `(select auth.uid())`
   - Helper functions: `get_current_owner_user_id()`, `get_current_tenant_id()`
   - See `.claude/rules/rls-policies.md` for full policy rules

4. **Clean up existing sections:**
   - Verify no stale references exist
   - Ensure "Backend: Supabase + Stripe" is accurate and descriptive

## Files Modified

- `CLAUDE.md`

## Verification

- No NestJS/Railway/backend/apiRequest references in CLAUDE.md
- PostgREST patterns documented
- Edge Function patterns documented
- RLS security model documented
- All existing rules preserved
