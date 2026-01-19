# ADR-0008: Cold Start & Performance Optimization

## Status

Proposed

## Context

TenantFlow's NestJS backend deploys to Railway, where cold starts only occur during new deployments (paid tier doesn't sleep services). We audited startup performance and lazy loading opportunities to understand optimization potential.

**Current Measurements:**

| Metric | Value |
|--------|-------|
| Startup time (local) | **0.87s** |
| Total module code | 94,084 lines |
| Module count | 53 modules |
| Codebase size | ~200k lines total |

**Railway Deployment Characteristics:**
- Zero-downtime deployments (new container starts alongside old)
- No cold start on warm instances (paid tier)
- Cold starts only during deployments
- Health check verification before traffic switch

## Decision

**No lazy loading implementation recommended** based on audit findings.

### Lazy Loading Assessment

All three candidate modules have controllers, making them ineligible for NestJS lazy loading:

| Module | Lines | Controllers | Lazy-Loadable? | Reason |
|--------|-------|-------------|----------------|--------|
| PDF | 6,893 | 2 (LeaseGenerationController, DocumentTemplateController) | **NO** | Controllers must register at startup |
| DocuSeal | 2,210 | 1 (DocuSealWebhookController) | **NO** | Webhook controller must be eager |
| Stripe-Sync | 623 | 2 (StripeSyncController, WebhookHealthController) | **NO** | Health controller must be eager |

**NestJS Limitation:** Controllers, Gateways, and GraphQL resolvers cannot be lazy loaded - routes must register at startup.

### Current Performance Assessment

The 0.87s startup time is already excellent for a 94k-line backend with 53 modules. For comparison:
- Industry average NestJS startup: 2-5s
- Reported lazy loading improvements: 50-60% reduction
- Even with 60% improvement, we'd only save ~0.5s

**Conclusion:** Optimization effort exceeds benefit given current performance.

## Recommendations

### Implemented (This Phase)

1. **Config fallback fix** - Added `SB_SECRET_KEY` fallback for `SUPABASE_SERVICE_ROLE_KEY` to align with Doppler naming

### Future Considerations (Not Urgent)

1. **Supabase Connection Pooling**
   - Currently using direct connections (port 5432)
   - Supavisor transaction mode (port 6543) could improve connection efficiency
   - Recommended for high-concurrency scenarios
   - Implementation: Update connection strings to use pooler URL

2. **Module Import Order**
   - Current order is acceptable
   - If startup time increases, consider reordering heavy modules last

3. **Memory Optimization**
   - Railway manages memory limits at platform level
   - V8 flags (--max-old-space-size) only needed if OOM errors occur
   - Current implementation uses Redis-backed cache (not in-memory)

### Not Recommended

1. **Fastify Migration**
   - 3-4% improvement over Express
   - Not worth migration cost for current scale

2. **Lazy Loading Implementation**
   - All candidates have controllers (ineligible)
   - Would require architectural changes to extract services
   - Current startup time doesn't justify effort

## Consequences

### Benefits

- **Documentation complete** - Performance characteristics documented for future reference
- **Baseline established** - 0.87s startup provides benchmark for future changes
- **Config improved** - Local development now works with Doppler prod config

### Trade-offs

- **No performance improvement** - Audit revealed optimization opportunities are limited
- **Connection pooling deferred** - Supavisor configuration left for future high-traffic phase

### Risks Mitigated

- **Future regression detection** - Baseline enables monitoring startup time drift
- **Architectural awareness** - Team understands lazy loading limitations

## References

- [NestJS Lazy Loading Documentation](https://docs.nestjs.com/fundamentals/lazy-loading-modules)
- [Supabase Connection Management](https://supabase.com/docs/guides/database/connection-management)
- [Railway Node.js Deployment Guide](https://docs.railway.com/guides/deploy-node-express-api-with-auto-scaling-secrets-and-zero-downtime)
- Phase 21 ADR-0007: Module Architecture
- Phase 22 RESEARCH.md: Cold Start Optimization Research

---

*Created: 2026-01-18*
*Phase: 22-cold-start-optimization*
