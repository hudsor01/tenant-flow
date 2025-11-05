# Phase 4 Implementation Plan

**Date**: 2025-11-05
**Status**: Ready to Start
**Branch**: `claude/tenantflow-remediation-roadmap-011CUozGzgcgZiJWHdZYoQYc`
**Prerequisite**: Phase 3 complete (automated tasks done, migrations documented)

---

## Overview

Phase 4 focuses on **production readiness finalization**: applying security migrations, type generation, comprehensive testing, and preparing for production deployment.

**Goals**:
- Apply all pending database migrations
- Regenerate Supabase types
- Execute comprehensive security testing
- Verify all systems operational
- Prepare production deployment checklist

---

## Phase 4 Tasks

### Task 4.1: Apply Database Migrations ⚠️ **CRITICAL**

**Status**: 🔄 Ready to Apply
**Dependencies**: Production database access, doppler
**Estimated Time**: 30 minutes
**Risk**: HIGH (affects payment security)

#### Subtasks

**4.1.1: Apply Payment RLS Migration**
- **File**: `supabase/migrations/20250215120000_add_rent_payment_rls.sql`
- **Command**: `doppler run -- psql $DIRECT_URL -f supabase/migrations/20250215120000_add_rent_payment_rls.sql`
- **Verification**: Check policies with `SELECT * FROM pg_policies WHERE tablename = 'rent_payment';`
- **Critical**: Service role enforcement for INSERT/UPDATE

**4.1.2: Apply Payment Method RLS Migration**
- **File**: `supabase/migrations/20250215120001_add_payment_method_rls.sql`
- **Command**: `doppler run -- psql $DIRECT_URL -f supabase/migrations/20250215120001_add_payment_method_rls.sql`
- **Verification**: Check policies with `SELECT * FROM pg_policies WHERE tablename = 'tenant_payment_method';`
- **Critical**: PCI DSS compliance

**4.1.3: Apply Notification Preferences Migration**
- **File**: `supabase/migrations/20250216000000_add_notification_preferences.sql`
- **Command**: `doppler run -- psql $DIRECT_URL -f supabase/migrations/20250216000000_add_notification_preferences.sql`
- **Verification**: Check column with `\d tenant`

**4.1.4: Verify Emergency Contact Migration**
- **Status**: Already applied - verification only
- **Command**: `SELECT * FROM pg_tables WHERE tablename = 'tenant_emergency_contact';`
- **Expected**: Table exists with RLS enabled

**Acceptance Criteria**:
- [ ] All 3 migrations applied successfully
- [ ] Verification SQL returns expected results
- [ ] No errors in PostgreSQL logs
- [ ] Backend can create payments via service role
- [ ] Frontend cannot create payments directly
- [ ] All RLS policies active

**Rollback Plan**: See `MIGRATIONS-TO-APPLY.md` for detailed rollback SQL

---

### Task 4.2: Regenerate Supabase Types ⚠️ **REQUIRED**

**Status**: 🔄 Ready to Execute
**Dependencies**: Doppler, migrations applied
**Estimated Time**: 5 minutes
**Risk**: MEDIUM (breaks TypeScript compilation if wrong)

#### Command
```bash
doppler run -- npx supabase gen types typescript \
  --project-id "bshjmbshupiibfiewpxb" \
  --schema public \
  > packages/shared/src/types/supabase-generated.ts
```

#### Verification
```bash
# Check file is not empty
wc -l packages/shared/src/types/supabase-generated.ts
# Expected: > 1000 lines

# Verify includes new tables/columns
grep "notification_preferences" packages/shared/src/types/supabase-generated.ts
grep "tenant_emergency_contact" packages/shared/src/types/supabase-generated.ts

# Run typechecks
pnpm --filter @repo/shared build
pnpm --filter @repo/backend typecheck
pnpm --filter @repo/frontend typecheck
```

**Acceptance Criteria**:
- [ ] Generated file > 1000 lines (not empty)
- [ ] Includes `notification_preferences` column
- [ ] Includes `tenant_emergency_contact` table
- [ ] All 3 typecheck commands pass
- [ ] No TypeScript compilation errors

**Rollback Plan**:
```bash
git checkout HEAD~1 packages/shared/src/types/supabase-generated.ts
```

---

### Task 4.3: Run Backend Integration Tests

**Status**: 🔄 Ready to Run
**Dependencies**: Migrations applied, types regenerated
**Estimated Time**: 10 minutes
**Risk**: LOW

#### Test Execution
```bash
# Start backend
doppler run -- pnpm --filter @repo/backend dev

# In another terminal, run tests
pnpm --filter @repo/backend test:integration rls/
```

#### Expected Results
```
✓ RLS: Payment Isolation (15 tests)
✓ RLS: Tenant Isolation (13 tests)
✓ RLS: Property Isolation (18 tests)

Test Suites: 3 passed, 3 total
Tests: 46 passed, 46 total
```

**Acceptance Criteria**:
- [ ] All 46+ RLS tests pass
- [ ] No test failures or errors
- [ ] Test execution completes in < 5 minutes
- [ ] Coverage reports generated

**If Tests Fail**:
1. Check migration application status
2. Verify RLS policies active
3. Review test logs for specific failures
4. Fix issues and re-run

---

### Task 4.4: Execute Manual Security Tests ⚠️ **CRITICAL**

**Status**: 🔄 Ready to Execute
**Dependencies**: Migrations applied, backend running
**Estimated Time**: 2 hours (17 test scenarios)
**Risk**: HIGH (validates security boundaries)

#### Test Guide
Follow **E2E-SECURITY-VERIFICATION.md** for detailed procedures

#### Critical Tests (MUST PASS)
1. **Test 3.1**: Direct payment INSERT prevention
   - Tenant attempts direct DB insert
   - Expected: RLS policy violation error
   - Status: [ ] PASS [ ] FAIL

2. **Test 3.2**: Direct payment UPDATE prevention
   - Tenant attempts to modify payment amount
   - Expected: RLS policy violation error
   - Status: [ ] PASS [ ] FAIL

3. **Test 3.3**: Backend payment creation (positive)
   - Backend creates payment via API
   - Expected: Success
   - Status: [ ] PASS [ ] FAIL

4. **Test 3.4**: Webhook payment creation (positive)
   - Stripe webhook creates payment
   - Expected: Success
   - Status: [ ] PASS [ ] FAIL

#### All 17 Test Scenarios
- [ ] 1.1: Profile access isolation
- [ ] 1.2: Lease access isolation
- [ ] 1.3: Payment history isolation
- [ ] 1.4: Emergency contact isolation
- [ ] 2.1: Dashboard access prevention
- [ ] 2.2: Property management prevention
- [ ] 2.3: Tenant management prevention
- [ ] 3.1: Payment INSERT prevention ⚠️ CRITICAL
- [ ] 3.2: Payment UPDATE prevention ⚠️ CRITICAL
- [ ] 3.3: Backend payment creation ⚠️ CRITICAL
- [ ] 3.4: Webhook payment creation ⚠️ CRITICAL
- [ ] 4.1: Own contact CRUD
- [ ] 4.2: Cross-tenant contact prevention
- [ ] 5.1: Cross-landlord property access
- [ ] 5.2: Cross-landlord unit creation
- [ ] 6.1: Tenant → Landlord RBAC
- [ ] 6.2: Landlord → Tenant RBAC

**Test Results Document**: Fill out template in E2E-SECURITY-VERIFICATION.md

**Acceptance Criteria**:
- [ ] All 17 tests executed
- [ ] Critical tests (3.1-3.4) PASS
- [ ] At least 15/17 tests PASS (88% pass rate)
- [ ] Any failures documented with reproduction steps
- [ ] Test results template completed

**If Critical Tests Fail**:
- 🚨 **STOP DEPLOYMENT IMMEDIATELY**
- Review RLS policies applied
- Check service role enforcement
- Review application logs
- Fix issues before proceeding

---

### Task 4.5: Performance Verification

**Status**: 🔄 Ready to Execute
**Dependencies**: All previous tasks complete
**Estimated Time**: 30 minutes
**Risk**: LOW

#### Performance Metrics

**4.5.1: RLS Policy Performance**
```sql
-- Check RLS overhead (should be < 50ms)
EXPLAIN ANALYZE
SELECT * FROM rent_payment
WHERE tenantId = 'test-user-id';

-- Verify helper functions improve performance
EXPLAIN ANALYZE
SELECT * FROM tenant_payment_method
WHERE tenantId = get_current_tenant();
```

**4.5.2: API Response Times**
- Property list: < 500ms
- Tenant dashboard: < 1000ms
- Payment history: < 300ms
- Lease details: < 200ms

**4.5.3: Database Query Performance**
```sql
-- Check slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Acceptance Criteria**:
- [ ] No queries > 2 seconds
- [ ] RLS policy overhead < 50ms
- [ ] API response times within targets
- [ ] No N+1 query issues
- [ ] Database connection pool healthy

---

### Task 4.6: Documentation Finalization

**Status**: 🔄 Ready to Complete
**Dependencies**: All testing complete
**Estimated Time**: 30 minutes
**Risk**: LOW

#### Documents to Update

**4.6.1: Update PHASE-3-STATUS.md**
- Mark all manual tasks as complete
- Update test results section
- Add production deployment date
- Sign-off section

**4.6.2: Create Production Deployment Checklist**
- Pre-deployment checks
- Migration application order
- Verification steps
- Rollback procedures
- Post-deployment monitoring

**4.6.3: Update README (if needed)**
- Add Phase 3 security enhancements
- Update setup instructions
- Document new environment variables
- Update testing instructions

**Acceptance Criteria**:
- [ ] PHASE-3-STATUS.md updated with results
- [ ] Production deployment checklist created
- [ ] All documentation reviewed for accuracy
- [ ] Links between documents verified

---

### Task 4.7: Production Deployment Preparation

**Status**: 🔄 Ready to Prep
**Dependencies**: All previous tasks complete
**Estimated Time**: 1 hour
**Risk**: MEDIUM

#### Deployment Checklist Creation

**4.7.1: Pre-Deployment**
- [ ] Database backup created
- [ ] Environment variables verified
- [ ] CI/CD pipeline passing
- [ ] Staging deployment successful
- [ ] Team notified of deployment window
- [ ] Rollback plan documented

**4.7.2: Deployment Steps**
1. Apply database migrations (production)
2. Regenerate Supabase types (production)
3. Deploy backend (Railway)
4. Deploy frontend (Vercel)
5. Run smoke tests
6. Monitor for 1 hour

**4.7.3: Post-Deployment**
- [ ] Payment creation working
- [ ] Stripe webhooks processing
- [ ] No RLS policy violations in logs
- [ ] API response times normal
- [ ] Error rate < 1%
- [ ] 24-hour monitoring plan activated

**4.7.4: Rollback Triggers**
- Payment creation failing
- Stripe webhooks not processing
- API error rate > 5%
- Critical security test failures
- Database performance degradation

**Acceptance Criteria**:
- [ ] Deployment checklist completed
- [ ] Rollback procedures documented
- [ ] Monitoring alerts configured
- [ ] Team sign-off obtained
- [ ] Deployment window scheduled

---

## Phase 4 Success Metrics

Phase 4 is **COMPLETE** when:

1. ✅ **All Migrations Applied**
   - Payment RLS active
   - Payment Method RLS active
   - Notification preferences added
   - Emergency contact verified

2. ✅ **Types Regenerated**
   - File > 1000 lines
   - All typechecks pass
   - No compilation errors

3. ✅ **Tests Passing**
   - Backend RLS tests: 46/46 passing
   - Manual security tests: 15/17 passing (min 88%)
   - Critical tests: 4/4 passing

4. ✅ **Performance Verified**
   - API response times within targets
   - RLS overhead < 50ms
   - No slow queries (> 2s)

5. ✅ **Documentation Complete**
   - PHASE-3-STATUS.md updated
   - Production checklist created
   - Test results documented

6. ✅ **Deployment Ready**
   - Staging deployment successful
   - Rollback plan documented
   - Team sign-off obtained

---

## Risk Assessment

### HIGH RISK
- **Task 4.1**: Database migrations (affects payment security)
- **Task 4.4**: Manual security tests (validates security boundaries)

**Mitigation**: Apply to staging first, verify all tests pass, have rollback ready

### MEDIUM RISK
- **Task 4.2**: Type regeneration (breaks compilation if wrong)
- **Task 4.7**: Production deployment (user-facing changes)

**Mitigation**: Test locally first, commit before regenerating, deploy during low-traffic window

### LOW RISK
- **Task 4.3**: Backend tests (read-only verification)
- **Task 4.5**: Performance verification (monitoring only)
- **Task 4.6**: Documentation (no code changes)

---

## Timeline Estimate

| Task | Estimated Time | Dependencies |
|------|---------------|--------------|
| 4.1: Migrations | 30 min | Doppler, DB access |
| 4.2: Type Gen | 5 min | Migrations |
| 4.3: Backend Tests | 10 min | Types |
| 4.4: Manual Tests | 2 hours | Migrations |
| 4.5: Performance | 30 min | All tests |
| 4.6: Docs | 30 min | Testing complete |
| 4.7: Deployment Prep | 1 hour | All complete |

**Total**: ~4.5 hours (can be split across multiple sessions)

---

## Dependencies

### Required Access
- [ ] Doppler CLI installed and configured
- [ ] Production database credentials
- [ ] Supabase project access
- [ ] Railway deployment access
- [ ] Vercel deployment access

### Required Tools
- [ ] PostgreSQL client (`psql`)
- [ ] Node.js (v20+)
- [ ] pnpm
- [ ] Git

### Required Environments
- [ ] Backend running locally
- [ ] Frontend running locally
- [ ] Staging environment accessible
- [ ] Production environment (read-only initially)

---

## Rollback Strategy

If any task fails critically:

1. **Stop Immediately** - Do not proceed to next task
2. **Assess Impact** - Determine scope of failure
3. **Execute Rollback** - Use documented rollback SQL/procedures
4. **Verify Rollback** - Ensure system returned to previous state
5. **Document Issue** - Capture logs, errors, reproduction steps
6. **Fix and Retry** - Address root cause before re-attempting

**Critical Rollback Scenarios**:
- Database migration fails → Run rollback SQL
- Tests fail after migration → Rollback migration, investigate
- Production deployment fails → Rollback deployment, verify staging
- Performance degradation → Rollback changes, investigate queries

---

## Communication Plan

**Before Phase 4**:
- Notify team of planned work
- Schedule deployment window (if production)
- Prepare rollback contacts

**During Phase 4**:
- Update status after each task
- Report blockers immediately
- Document any issues

**After Phase 4**:
- Share test results
- Document lessons learned
- Schedule retrospective

---

## Next Steps After Phase 4

Once Phase 4 is complete:

1. **Production Deployment** - Deploy to production during low-traffic window
2. **24-Hour Monitoring** - Monitor errors, performance, security logs
3. **User Acceptance Testing** - Verify all user flows work correctly
4. **Phase 5 Planning** - Plan next iteration (features, optimization, etc.)

---

## Quick Reference

**Migration Guide**: `MIGRATIONS-TO-APPLY.md`
**Security Tests**: `E2E-SECURITY-VERIFICATION.md`
**Service Role Audit**: `SERVICE-ROLE-VERIFICATION.md`
**Phase 3 Status**: `PHASE-3-STATUS.md`

**Backend RLS Tests**: `apps/backend/tests/integration/rls/`

---

**Phase 4 Plan Created**: 2025-11-05
**Status**: Ready to execute
**Estimated Completion**: 4-5 hours of focused work
