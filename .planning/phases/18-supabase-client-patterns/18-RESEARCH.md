# Phase 18: Supabase Client & Connection Patterns - Research

**Researched:** 2026-01-18
**Domain:** Supabase client patterns for NestJS backend
**Confidence:** HIGH

<research_summary>
## Summary

Researched Supabase connection management and NestJS singleton patterns for backend services. The current TenantFlow implementation already follows many best practices — singleton admin client, user client pool with TTL, RPC service with retries and caching.

Key finding: The codebase is well-architected. Focus should be on:
1. Verifying Supavisor connection pooling is optimally configured
2. Ensuring pool size allocation follows Supabase's 40/60 rule
3. Confirming `accessToken` callback pattern is used correctly (it is!)
4. Adding any missing lifecycle hooks

**Primary recommendation:** Audit configuration rather than refactor code. The existing patterns are correct — focus on pool sizing, connection limits, and observability.

</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.x | Supabase client | Official SDK with TypeScript support |
| @supabase/ssr | ^0.x | SSR utilities | Handles cookies/sessions (frontend use) |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Custom pool class | N/A | User client caching | High-concurrency user requests |
| NestJS DI | ^11.x | Singleton management | All service injection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom user pool | Per-request clients | Pool is better for performance (cache hit ~90%) |
| Single admin client | Client per schema | Single client is correct for TenantFlow (single schema) |

**Current Setup (Already Correct):**
```typescript
// Admin client - singleton via NestJS DI
@Inject(SUPABASE_ADMIN_CLIENT)
private readonly adminClient: SupabaseClient<Database>

// User client - pooled with TTL and health checks
getUserClient(userToken: string): SupabaseClient<Database> {
  return this.getUserClientPool().getClient(userToken)
}
```

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Current Project Structure (Already Correct)
```
apps/backend/src/database/
├── supabase.module.ts            # Global module with DI
├── supabase.service.ts           # Main service (facade)
├── supabase-user-client-pool.ts  # User client caching
├── supabase-rpc.service.ts       # RPC with retries/caching
├── supabase-cache.service.ts     # Response caching
├── supabase-health.service.ts    # Health checks
├── supabase-instrumentation.service.ts  # Metrics
└── supabase.constants.ts         # Tokens and configs
```

### Pattern 1: Singleton Admin Client (IMPLEMENTED)
**What:** Single admin client created once, injected everywhere
**When to use:** Backend services, webhooks, background jobs
**Status:** ✅ Already implemented correctly

```typescript
// supabase.module.ts - correct pattern
{
  provide: SUPABASE_ADMIN_CLIENT,
  useFactory: (config, logger) => {
    return createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
}
```

### Pattern 2: User Client Pool with accessToken (IMPLEMENTED)
**What:** Pool of user-scoped clients using `accessToken` callback
**When to use:** User requests that need RLS enforcement
**Status:** ✅ Already implemented correctly

```typescript
// supabase-user-client-pool.ts - correct pattern
const client = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  accessToken: async () => userToken  // ✅ Recommended pattern
})
```

### Pattern 3: Lifecycle Management (IMPLEMENTED)
**What:** Cleanup on module destroy
**When to use:** Always for database clients
**Status:** ✅ Already implemented

```typescript
// supabase.service.ts
onModuleDestroy(): void {
  this.userClientPool?.close()
}
```

### Anti-Patterns to Avoid
- **Creating client in render/request loop:** Use singleton or pool instead ✅
- **Using deprecated global.headers.Authorization:** Use `accessToken` callback ✅
- **Ignoring lifecycle hooks:** Always implement OnModuleDestroy ✅
- **Multiple GoTrueClient instances:** Pool handles this correctly ✅

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom TCP pooling | Supavisor (server-side) | Supabase handles it at infrastructure level |
| Auth token refresh | Manual token management | `accessToken` callback | SDK handles lifecycle correctly |
| RPC retries | Manual retry loops | Existing SupabaseRpcService | Already built with exponential backoff |
| Client caching | Simple Map | SupabaseUserClientPool | TTL, health checks, metrics already done |

**Key insight:** The codebase already doesn't hand-roll these things. The focus should be on configuration tuning, not code changes.

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Pool Size Misconfiguration
**What goes wrong:** Too many direct connections overwhelm Postgres
**Why it happens:** Not following Supabase's 40/60 allocation rule
**How to avoid:** If heavily using PostgREST API, keep pool at 40%. Otherwise can use up to 80%.
**Warning signs:** Connection timeouts, "too many connections" errors
**Action:** Audit current Supabase dashboard pool settings

### Pitfall 2: Using Session Mode When Transaction Mode Suffices
**What goes wrong:** Unnecessary connection holding
**Why it happens:** Default is session mode (port 5432)
**How to avoid:** Use transaction mode (port 6543) for stateless backends
**Warning signs:** High idle connection count in pg_stat_activity
**Action:** Verify connection string uses correct port

### Pitfall 3: Missing Health Checks on Pooled Clients
**What goes wrong:** Stale clients cause random failures
**Why it happens:** Tokens expire, connections drop
**How to avoid:** Periodic health checks (already implemented!)
**Warning signs:** Intermittent auth failures
**Status:** ✅ Already handled by SupabaseUserClientPool

### Pitfall 4: Not Typing the Client
**What goes wrong:** No autocomplete, runtime type errors
**Why it happens:** Forgetting `createClient<Database>()`
**How to avoid:** Always pass Database type generic
**Status:** ✅ Already typed correctly throughout

### Pitfall 5: Multiple GoTrueClient Warning
**What goes wrong:** Undefined behavior with concurrent auth operations
**Why it happens:** Creating multiple clients with same storage key
**How to avoid:** Singleton for admin, pool for users with unique keys
**Status:** ✅ Pool uses token prefix as key, avoiding collision

</common_pitfalls>

<code_examples>
## Code Examples

### Current Correct Admin Client Setup
```typescript
// Source: apps/backend/src/database/supabase.module.ts
return createClient<Database>(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: { 'x-client-info': 'tenantflow-backend' }
  },
  db: { schema: 'public' }
})
```

### Current Correct User Client Creation
```typescript
// Source: apps/backend/src/database/supabase-user-client-pool.ts
const client = createClient<Database>(
  this.options.supabaseUrl,
  this.options.supabasePublishableKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    accessToken: async () => userToken  // Recommended pattern
  }
)
```

### Supavisor Configuration (Dashboard)
```
Pool Size: 30-40 (if using PostgREST heavily) or up to 80
Mode: Transaction (port 6543) for stateless backends
Max Client Connections: Based on compute tier
```

</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| global.headers.Authorization | accessToken callback | 2024 | Better token lifecycle handling |
| PgBouncer only | Supavisor (default) | 2024 | More scalable, Elixir-based |
| Session mode default | Transaction mode recommended | 2024 | Better for serverless/backends |

**New tools/patterns to consider:**
- **Supavisor transaction mode:** Better connection efficiency for NestJS
- **Connection string pooler URL:** Automatic Supavisor routing

**Deprecated/outdated:**
- **global.headers.Authorization:** Use accessToken callback instead ✅ (already done)
- **Manual connection pooling:** Supavisor handles this at infrastructure level

</sota_updates>

<open_questions>
## Open Questions

1. **Current pool size configuration?**
   - What we know: Supabase recommends 40-80% allocation
   - What's unclear: Current dashboard settings
   - Recommendation: Audit Supabase dashboard during planning

2. **Transaction vs Session mode?**
   - What we know: Transaction mode better for stateless backends
   - What's unclear: Current connection string configuration
   - Recommendation: Verify connection strings during planning

3. **Cold start impact?**
   - What we know: Admin client is singleton, should be fast
   - What's unclear: Actual cold start times
   - Recommendation: Measure during Phase 22 (cold start optimization)

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [Supabase Connection Management Docs](https://supabase.com/docs/guides/database/connection-management) - Pool sizing, Supavisor
- [Supabase Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) - Pooling modes
- Codebase audit: apps/backend/src/database/ - Current implementation

### Secondary (MEDIUM confidence)
- [NestJS Singleton Patterns](https://dev.to/this-is-learning/a-deep-dive-into-the-nestjs-injection-scope-39ih) - DI scope guidance
- [NestJS Prisma Singleton Pattern](https://dev.to/micobarac/nestjs-prisma-singleton-provider-service-with-extensions-10j1) - Lifecycle hooks
- [GitHub Discussion: Multiple Clients](https://github.com/orgs/supabase/discussions/21027) - Multi-client patterns

### Tertiary (LOW confidence - needs validation)
- Community patterns for multi-schema usage - not applicable (single schema)

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Supabase JS client v2
- Ecosystem: NestJS DI, Supavisor connection pooling
- Patterns: Singleton admin, pooled users, lifecycle management
- Pitfalls: Pool sizing, mode selection, typing

**Confidence breakdown:**
- Standard stack: HIGH - verified with official docs and codebase
- Architecture: HIGH - current implementation matches best practices
- Pitfalls: HIGH - documented in Supabase docs
- Code examples: HIGH - from actual codebase

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - Supabase ecosystem stable)

</metadata>

---

*Phase: 18-supabase-client-patterns*
*Research completed: 2026-01-18*
*Ready for planning: yes*

## Key Finding

**The codebase already implements Supabase best practices correctly.** Phase 18 should focus on:

1. **Configuration audit** — Verify Supavisor pool settings in dashboard
2. **Connection string verification** — Ensure using pooler URL with transaction mode
3. **Observability gaps** — Add metrics for connection pool health if missing
4. **Documentation** — Codify current patterns for team reference

This is a "verify and tune" phase, not a "refactor" phase.
