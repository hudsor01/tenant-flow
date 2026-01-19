# Phase 22: Cold Start & Performance Optimization - Research

**Researched:** 2026-01-18
**Purpose:** Inform planning with ecosystem knowledge and best practices

## Research Summary

| Domain | Key Finding | Applicability |
|--------|-------------|---------------|
| NestJS Lazy Loading | 60% cold start reduction possible | HIGH - billing/pdf modules |
| Railway Platform | No cold start on paid tier; use health checks | MEDIUM - verify configuration |
| Supabase Pooling | Transaction mode (port 6543) optimal | HIGH - not currently using pooler |
| Memory Optimization | V8 flags for container environments | LOW - Railway handles this |
| Fastify Migration | 3-4% improvement over Express | LOW - not worth migration cost |

## Domain 1: NestJS Cold Start Optimization

### Standard Stack

**LazyModuleLoader** from `@nestjs/core` is the official solution:

```typescript
import { LazyModuleLoader } from '@nestjs/core';

@Injectable()
export class CatsService {
  constructor(private lazyModuleLoader: LazyModuleLoader) {}

  async loadHeavyModule() {
    const { HeavyModule } = await import('./heavy.module');
    const moduleRef = await this.lazyModuleLoader.load(() => HeavyModule);
    return moduleRef.get(HeavyService);
  }
}
```

### Performance Data

- First lazy load: ~2.4ms
- Subsequent loads: ~0.3ms (cached)
- Reported improvements: 50-60% cold start reduction

### Limitations (Critical)

**Cannot lazy load:**
- Controllers (routes must register at startup)
- Gateways (WebSocket)
- GraphQL resolvers (schema generation needs all classes)
- Lifecycle hooks not invoked in lazy modules

### Best Candidates for Lazy Loading

Based on Phase 21 findings:

| Module | Lines | Services | Lazy Load? | Reason |
|--------|-------|----------|------------|--------|
| pdf | 8,600 | 4 | YES | Heavy, not always needed |
| billing/webhooks | 2,000 | 3 | NO | Controllers, must be eager |
| billing/connect | 3,000 | 4 | PARTIAL | Services can be lazy |
| docuseal | 1,200 | 2 | YES | External integration, rarely used |
| stripe-sync | 800 | 2 | YES | Background job, not request path |

### What NOT to Hand-Roll

- Use `LazyModuleLoader` from `@nestjs/core` - don't build custom lazy loading
- Use webpack code splitting for Lambda deployments (not applicable to Railway)

**Sources:**
- [NestJS Lazy Loading Documentation](https://docs.nestjs.com/fundamentals/lazy-loading-modules)
- [60% Cold Start Reduction Article](https://medium.com/@connect.hashblock/how-i-reduced-cold-start-time-in-nestjs-by-60-with-lazy-module-loading-4d95830d6f6a)
- [Lazy Loading Trick for 2x Faster Boot](https://medium.com/@ThinkingLoop/the-lazy-loading-trick-that-made-my-nestjs-boot-twice-as-fast-8f3c98a42148)

---

## Domain 2: Railway Deployment Optimization

### Key Finding: No Sleep = No Cold Start

Railway's paid tier ($5+) doesn't sleep services, unlike Heroku's free tier. This means:
- First request doesn't wait for container startup
- Continuous running = warm instances
- Cold starts only occur during new deployments

### Deployment Best Practices

1. **Health Check Endpoint** - Railway verifies app readiness
   - Already implemented: `/health` and `/health/ready`

2. **Zero-Downtime Deployments** - Railway supports this natively
   - New container starts alongside old
   - Traffic switches after health check passes

3. **Auto-Scaling** - Railway scales on traffic automatically
   - No configuration needed for basic scaling

### Current State Assessment

TenantFlow already has:
- Health endpoints configured in `HEALTH_PATHS`
- Graceful shutdown hooks enabled (`app.enableShutdownHooks()`)
- Proper port binding (`0.0.0.0`)

### Optimization Opportunities

1. **Startup Time Logging** - Already implemented
   ```typescript
   const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
   logger.log(`STARTUP: Completed in ${startupTime}s`, 'Bootstrap')
   ```

2. **Measure actual startup time in production** - Capture Railway metrics

**Sources:**
- [Railway Node.js Deployment Guide](https://docs.railway.com/guides/deploy-node-express-api-with-auto-scaling-secrets-and-zero-downtime)
- [Deploy Node.js on Railway 2025](https://medium.com/lets-code-future/how-to-deploy-your-node-js-backend-on-railway-in-2025-a-step-by-step-guide-d729c970797d)

---

## Domain 3: Supabase Connection Pooling

### Critical Finding: Not Using Connection Pooler

Current implementation connects directly to Supabase without connection pooling:
- Direct connection URL (port 5432)
- No pgbouncer or supavisor configuration detected

### Recommended Architecture

**Transaction Mode (Port 6543)** - Optimal for APIs:
- Connection borrowed only for single transaction
- Immediately released back to pool
- Maximizes concurrency

```
# Direct (current)
postgres://user:pass@db.xxx.supabase.co:5432/postgres

# With Supavisor (recommended)
postgres://user.xxx:pass@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### Pool Size Guidelines

| Use Case | Recommended Pool % |
|----------|-------------------|
| Heavy PostgREST usage | 40% of max |
| Standard API | 60-80% of max |
| Background jobs | 20-40% dedicated |

### Implementation Notes

1. **Disable prepared statements** when using Transaction Mode
2. **Use separate pools** for different workloads (API vs background jobs)
3. **Monitor with Supabase Dashboard** connection metrics

### Current State

TenantFlow uses:
- Admin client (service role) for webhooks/background
- User client pool (50 max, 5-min TTL) for authenticated requests
- No pooler connection strings configured

**Sources:**
- [Supabase Connection Management](https://supabase.com/docs/guides/database/connection-management)
- [PgBouncer on Supabase](https://supabase.com/blog/supabase-pgbouncer)
- [Dedicated Poolers](https://supabase.com/blog/dedicated-poolers)

---

## Domain 4: Memory Optimization

### V8 Flags for Containers

For container environments with memory constraints:

```bash
# Limit old space (heap)
node --max-old-space-size=200 dist/main.js

# Optimize semi-space for better GC
node --max-semi-space-size=64 dist/main.js
```

### Railway Considerations

Railway manages memory limits at the platform level. Explicit V8 flags may not be needed unless:
- OOM errors occur frequently
- Memory profiling shows excessive heap growth

### NestJS Memory Patterns

Common causes of memory issues:
- Unbounded caches (use LRU with max size)
- Large file uploads in memory (stream instead)
- Memory leaks in long-running services

### Current State

TenantFlow has:
- Redis-backed cache (not in-memory)
- Cleanup timers with `.unref()` in client pool
- No explicit V8 flags configured

**Sources:**
- [V8 GC Optimization](https://blog.platformatic.dev/optimizing-nodejs-performance-v8-memory-management-and-gc-tuning)
- [NestJS Memory Optimization in Kubernetes](https://www.liquidxgroup.xyz/blog/optimizing-nestjs-app-memory-usage-in-kubernetes)

---

## Domain 5: Additional Optimizations

### Fastify vs Express

**Finding:** 3-4% improvement not worth migration cost.

Current Express setup is well-optimized:
- Body parser disabled (manual configuration)
- Trust proxy enabled
- Proper middleware ordering

### Node.js Version

Keep Node.js updated - each major version brings performance improvements:
- v18 → v20: ~10% performance gain
- v20 → v22: Additional improvements

### Log Level Optimization

Production should use `warn` or `error` level, not `debug`:
- Reduces I/O overhead
- Already configured via environment

### Global Pipes/Guards

Current setup uses 4 global guards (Throttler, JWT, Subscription, Roles). Consider:
- Order matters (most rejections first)
- `@Public()` decorator skips auth efficiently

**Sources:**
- [NestJS Performance Guide](https://dev.to/leolanese/nestjs-performance-2kcb)
- [Avoiding NestJS Performance Bottlenecks](https://medium.com/@Fcmam5/avoiding-nestjs-performance-bottlenecks-78fa2bc66372)

---

## Recommendations for Phase 22

### High Priority (Implement)

1. **Lazy Load Heavy Modules**
   - PDF module (8.6k lines)
   - DocuSeal module (external integration)
   - Stripe Sync module (background only)

2. **Configure Supabase Connection Pooler**
   - Switch to Transaction Mode (port 6543)
   - Configure separate pool for background jobs

### Medium Priority (Audit)

3. **Measure Current Startup Time**
   - Capture Railway deployment metrics
   - Establish baseline for improvements

4. **Review Module Import Order**
   - Critical modules first
   - Heavy/optional modules last

### Low Priority (Monitor)

5. **Memory Profiling**
   - Only if OOM errors occur
   - Railway provides built-in metrics

6. **Fastify Migration**
   - Not recommended currently
   - Only if Express becomes bottleneck

---

## Ecosystem Standard Stack

| Concern | Solution | Status |
|---------|----------|--------|
| Lazy Loading | `@nestjs/core` LazyModuleLoader | NOT IMPLEMENTED |
| Connection Pooling | Supabase Supavisor (port 6543) | NOT IMPLEMENTED |
| Memory Limits | V8 `--max-old-space-size` | Platform-managed |
| Health Checks | Native NestJS HealthModule | IMPLEMENTED |
| Metrics | Prometheus + Sentry | IMPLEMENTED |

---

*Phase: 22-cold-start-optimization*
*Research completed: 2026-01-18*
