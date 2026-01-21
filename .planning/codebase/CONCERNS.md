# Codebase Concerns

**Analysis Date:** 2026-01-15

## Tech Debt

**35 Skipped Database Migrations:**
- Issue: 35 migration files renamed to `.sql.skip` to bypass execution
- Files: `supabase/migrations/*.sql.skip` (35 files)
- Why: RLS policy errors, duplicate function definitions, security issues
- Impact: Database schema may be incomplete, security policies not applied
- Fix approach: Review and fix each migration individually, consolidate into clean migration

**God Module - Billing:**
- Issue: billing module contains 15+ services, 6 controllers in single module
- Files: `apps/backend/src/modules/billing/` (entire directory)
- Why: Organic growth without refactoring
- Impact: Hard to test, understand, maintain; circular dependencies risk
- Fix approach: Split into sub-modules: `customers/`, `subscriptions/`, `webhooks/`, `connect/`

**181 Admin Client Usages:**
- Issue: Admin/service role Supabase client used extensively instead of RLS
- Files: Throughout `apps/backend/src/modules/` (181 instances per health report)
- Why: RLS policies incomplete, easier to bypass during development
- Impact: Security risk - bypasses row-level security; inconsistent auth model
- Fix approach: Audit each usage, add proper RLS policies, convert to user-scoped client

**Dead Code:**
- Issue: Unused exports, functions, and types throughout codebase
- Files: Various (detected by health report analysis)
- Why: Features removed but code left behind
- Impact: Increased bundle size, confusion during maintenance
- Fix approach: Run dead code analysis, remove unused exports

## Known Bugs

**RLS Policy Vulnerabilities in Skipped Migrations:**
- Symptoms: Some policies may allow unauthorized access
- Trigger: N/A - policies not applied due to skipped migrations
- Files: `supabase/migrations/20251220060000_secure_stripe_schema_rls.sql.skip` (has `USING (true)` - allows all access)
- Workaround: Admin client bypasses RLS anyway
- Root cause: Incomplete RLS implementation before skipping
- Fix: Review and apply secure policies

**Missing WITH CHECK Clauses:**
- Symptoms: INSERT policies may be incomplete
- Trigger: INSERT operations without proper policy checks
- Files: Multiple skipped migrations contain INSERT policies without WITH CHECK
- Root cause: Policy syntax errors in original migrations
- Fix: Add proper WITH CHECK clauses to INSERT/UPDATE policies

## Security Considerations

**Admin Client Overuse:**
- Risk: 181 usages of service role client bypasses all RLS
- Files: `apps/backend/src/modules/` (throughout)
- Current mitigation: Backend guards provide some auth, but not row-level
- Recommendations: Implement proper RLS, use user-scoped client, audit admin usages

**Incomplete RLS Policies:**
- Risk: Tables may be accessible without proper authorization
- Files: `supabase/migrations/*.sql.skip` (35 files with policy definitions)
- Current mitigation: Admin client usage, backend guards
- Recommendations: Apply skipped migrations with fixed policies, test thoroughly

**Stripe Webhook Signature:**
- Risk: Webhook handlers must verify Stripe signatures
- File: `apps/backend/src/modules/billing/stripe-webhook.controller.ts`
- Current mitigation: Using `stripe.webhooks.constructEvent` (correct approach)
- Recommendations: Ensure all webhook endpoints verify signatures

## Performance Bottlenecks

**No Specific Performance Issues Detected**
- Note: Health report focused on security/architecture, not performance
- Recommendation: Add APM monitoring (consider Sentry Performance)

## Fragile Areas

**Billing Module:**
- File: `apps/backend/src/modules/billing/` (entire module)
- Why fragile: 15+ services, 6 controllers, complex Stripe integration
- Common failures: Webhook handler errors, subscription state sync issues
- Safe modification: Add tests before changes, split into smaller modules
- Test coverage: Unknown (part of 31% backend coverage)

**Migration System:**
- Files: `supabase/migrations/` (82 total, 35 skipped)
- Why fragile: Skipped migrations create unpredictable schema state
- Common failures: New migrations may conflict with expected schema
- Safe modification: Run locally first, verify against skipped migration intent
- Test coverage: No migration tests

## Scaling Limits

**Not Analyzed**
- Note: Health report did not include scaling analysis
- Recommendation: Load test before production scale-up

## Dependencies at Risk

**Node.js 24 (Experimental):**
- Risk: Node.js 24 not yet LTS, may have breaking changes
- Impact: Runtime compatibility issues possible
- Migration plan: Monitor Node.js release schedule, test on LTS when available

**Go Backend-v2:**
- Risk: 0% test coverage, incomplete implementation
- Impact: Not production-ready
- Migration plan: Complete Go backend or remove if not needed

## Missing Critical Features

**Backend .env.example:**
- Problem: No `.env.example` for backend app
- Files: `apps/backend/` (missing file)
- Current workaround: Developers must know required env vars
- Blocks: Onboarding new developers, CI setup
- Implementation complexity: Low (create file with var names)

**CI/CD for Backend:**
- Problem: Backend not auto-deployed like frontend
- Current workaround: Manual Railway deployments
- Blocks: Automated release process
- Implementation complexity: Medium (GitHub Actions + Railway)

**Migration Validation in CI:**
- Problem: No CI step to validate migration syntax/RLS policies
- Current workaround: Manual review
- Blocks: Catching migration errors before merge
- Implementation complexity: Medium (add supabase db push --dry-run)

## Test Coverage Gaps

**Backend Services (31% coverage):**
- What's not tested: Most service logic, especially billing
- Risk: Regressions in critical business logic
- Priority: High
- Difficulty: Medium (need to mock Supabase, Stripe)

**Frontend Hooks (12% coverage):**
- What's not tested: API hooks, state management
- Risk: Data fetching bugs go unnoticed
- Priority: High
- Difficulty: Low (TanStack Query testing patterns well-documented)

**Go Backend (0% coverage):**
- What's not tested: Entire backend-v2
- Risk: Complete uncertainty about functionality
- Priority: Low (if Go backend not needed) / High (if needed)
- Difficulty: Medium (Go testing straightforward but time-consuming)

**E2E Flows:**
- What's not tested: Full user journeys
- Risk: Integration bugs between frontend/backend
- Priority: Medium
- Difficulty: Medium (Playwright setup exists)

---

*Concerns audit: 2026-01-15*
*Update as issues are fixed or new ones discovered*
