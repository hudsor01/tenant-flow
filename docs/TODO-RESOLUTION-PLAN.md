# TODO Resolution Plan

**Project**: TenantFlow  
**Generated**: 2025-01-18  
**Status**: Action Required

## Executive Summary

Found **~120 active TODO comments** across the codebase requiring systematic resolution. Two critical areas identified that block technical debt reduction and feature completion.

## Critical TODO Categories

### 🚨 **Category 1: Stripe Supabase Migration** (36 TODOs) - CRITICAL
- **Impact**: Blocks complete database migration, affects billing reliability
- **Files**: `apps/backend/src/stripe/` services
- **Pattern**: `TODO: Convert to Supabase` 
- **Priority**: HIGH - Affects production billing system

### 🔧 **Category 2: Queue Processor Implementation** (25+ TODOs) - HIGH  
- **Impact**: Email, notification, and payment processing incomplete
- **Files**: `apps/backend/src/queues/processors/`
- **Pattern**: `TODO: Implement [service] processing`
- **Priority**: MEDIUM - Affects feature completeness

### ✅ **Category 3: Frontend API Repositories** (3 TODOs) - RESOLVED
- **Status**: ✅ COMPLETED - `ApiTenantRepository`, `ApiLeaseRepository`, `ApiUnitRepository` implemented
- **Files**: `apps/frontend/src/services/service-container.ts`

## Resolution Strategy

### Phase 1: Stripe Supabase Migration (Week 1-2)
**Goal**: Complete database layer unification

**Implementation Plan**:
1. **Replace Prisma patterns with Supabase direct client calls**
2. **Update all `TODO: Convert to Supabase` comments** 
3. **Migrate subscription management to BaseSupabaseRepository pattern**
4. **Test billing workflows thoroughly**

**Files to Update**:
- `stripe-billing.service.ts` (10 TODOs)
- `webhook.service.ts` (28 TODOs) 
- `payment-recovery.service.ts` (4 TODOs)
- `webhook-health.service.ts` (2 TODOs)

### Phase 2: Queue Processor Implementation (Week 3-4)
**Goal**: Complete async processing infrastructure

**Implementation Plan**:
1. **Email processor**: Integrate with actual email service (SendGrid/SES)
2. **Payment processor**: Connect to Stripe payment processing
3. **Notification processor**: Implement multi-channel notifications
4. **Report processor**: Add PDF/Excel generation capabilities

**Files to Update**:
- `email.processor.ts` (6 TODOs)
- `payment.processor.ts` (9 TODOs)
- `notification.processor.ts` (4 TODOs)
- `report.processor.ts` (9 TODOs)

### Phase 3: Technical Debt Cleanup (Ongoing)
**Goal**: Prevent TODO accumulation

**Implementation Plan**:
1. **Integrate TODO tracking into CI/CD pipeline**
2. **Set TODO thresholds**: Max 5 critical, 15 high priority
3. **Regular TODO review**: Weekly team review of new TODOs
4. **Documentation requirements**: All TODOs must include timeline and owner

## Automated TODO Tracking

### CLI Commands Added
```bash
# Scan current TODOs
npm run todo:scan

# Generate report 
npm run todo:report

# Check thresholds (for CI)
npm run todo:check
```

### CI Integration
Add to GitHub Actions:
```yaml
- name: Check TODO Thresholds
  run: npm run todo:check
```

### Threshold Configuration
- **Critical TODOs**: 0 allowed (HACK, BUG comments)
- **High Priority**: Max 10 (FIXME comments)  
- **Medium Priority**: Max 25 (TODO comments)
- **Total**: Max 50 active TODOs

## Implementation Timeline

### Week 1: Stripe Migration Foundation
- [ ] Set up Supabase repository patterns for billing
- [ ] Replace 10 highest-impact Stripe TODOs
- [ ] Test subscription creation/update flows

### Week 2: Complete Stripe Migration  
- [ ] Finish all webhook.service.ts TODOs (28 items)
- [ ] Complete payment recovery implementation
- [ ] Full billing system testing

### Week 3: Queue Processor Core
- [ ] Implement email processor with real service
- [ ] Set up payment processor integration
- [ ] Add notification channels (email, SMS, push)

### Week 4: Feature Completion
- [ ] Complete report generation (PDF/Excel)
- [ ] Finish maintenance workflow automation
- [ ] Integration testing across all processors

## Success Metrics

### Technical Metrics
- **TODO Count**: Reduce from ~120 to <25 
- **Critical TODOs**: Maintain 0 count
- **Build Time**: Improve with reduced technical debt

### Business Metrics  
- **Billing Reliability**: 99.9% success rate for subscription operations
- **Email Delivery**: Functional notification system
- **Report Generation**: Automated PDF/Excel export capability

## Risk Mitigation

### Stripe Migration Risks
- **Billing Interruption**: Migrate during low-traffic hours
- **Data Consistency**: Comprehensive test coverage before migration
- **Rollback Plan**: Maintain Prisma compatibility during transition

### Queue Implementation Risks
- **Email Deliverability**: Start with test email service, validate before production
- **Processing Reliability**: Implement proper error handling and retry logic
- **Resource Usage**: Monitor queue processing for memory/CPU impact

## Next Actions

### Immediate (This Week)
1. **Start Stripe migration**: Begin with `stripe-billing.service.ts`
2. **Set up TODO tracking**: Integrate `npm run todo:check` into CI
3. **Create tracking issue**: GitHub issue to track migration progress

### Short Term (Next 2 Weeks)  
1. **Complete Stripe migration**: All 36 TODOs resolved
2. **Begin queue implementation**: Start with email processor
3. **Update documentation**: Reflect completed migrations

### Long Term (Next Month)
1. **TODO governance**: Establish team processes for TODO management
2. **Automated prevention**: Pre-commit hooks to limit TODO accumulation  
3. **Performance optimization**: Leverage completed migrations for performance gains

---

## Conclusion

This systematic approach to TODO resolution will:
- **Unblock technical debt** by completing the Supabase migration
- **Enable feature completeness** through queue processor implementation  
- **Prevent future accumulation** via automated tracking and governance

The plan prioritizes **business-critical billing system stability** while establishing **sustainable technical debt management processes**.

**Next Step**: Begin Stripe migration with `stripe-billing.service.ts` as the highest-impact file.