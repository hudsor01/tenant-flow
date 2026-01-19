# ADR-0004: Supabase Client Patterns

## Status

Accepted

## Context

TenantFlow uses Supabase as the backend-as-a-service provider, requiring proper client management for both administrative operations (webhooks, background jobs) and user-scoped requests (RLS-enforced queries). Without clear patterns, issues arise:

1. **Multiple GoTrueClient instances** - Creating clients per-request causes undefined auth behavior
2. **Connection leaks** - Improper lifecycle management leaves connections open
3. **Performance degradation** - Creating clients is expensive (~50ms per instantiation)
4. **RLS bypass risks** - Using admin client for user requests bypasses Row Level Security

## Decision

Implement a three-tier client strategy:

### 1. Singleton Admin Client (NestJS DI)

```typescript
// supabase.module.ts
{
  provide: SUPABASE_ADMIN_CLIENT,
  useFactory: (config, logger) => {
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
  }
}
```

**Use for:**
- Webhook handlers (Stripe, Auth) where there's no user context
- Background jobs and cron tasks
- Health checks
- Administrative operations

**Never use for:**
- User-initiated requests that should respect RLS

### 2. User Client Pool with `accessToken` Callback

```typescript
// supabase-user-client-pool.ts
const client = createClient<Database>(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  accessToken: async () => userToken  // Recommended pattern
})
```

**Configuration:**
- `maxPoolSize: 50` - Maximum cached clients
- `ttlMs: 5 minutes` - Client cache duration
- `healthCheckIntervalMs: 60 seconds` - Periodic token validation

**Use for:**
- All user requests that should respect RLS
- Operations where the current user's permissions matter

### 3. RPC Service with Retries and Caching

```typescript
// supabase-rpc.service.ts
await rpcService.rpc(client, 'function_name', args, {
  maxAttempts: 3,
  backoffMs: 500,
  timeoutMs: 10_000,
  cache: { ttlMs: 60_000 }
})
```

**Retry behavior:**
- Exponential backoff: 500ms, 1000ms, 2000ms
- Retries on transient errors only (network, timeout)
- No retry on auth errors or validation failures

## Why Not Alternatives

### Alternative: Per-Request Client Creation

**Rejected because:**
- ~50ms overhead per client instantiation
- Multiple GoTrueClient warnings in logs
- No reuse of authenticated sessions
- Memory pressure under load

### Alternative: Global `headers.Authorization`

**Rejected because:**
- Deprecated pattern as of Supabase SDK v2
- Doesn't integrate properly with token lifecycle
- `accessToken` callback is the documented approach

### Alternative: Connection Pooler for JS Client

**Not applicable because:**
- Supabase JS client uses REST API, not direct PostgreSQL
- Supavisor pooling applies to raw PostgreSQL connections (DATABASE_URL)
- The JS client handles its own HTTP connection reuse

## Consequences

### Positive

- **Performance:** Cache hit rate ~90% for user clients
- **Memory:** Bounded pool size prevents unbounded growth
- **Observability:** Full metrics via Prometheus (hits, misses, evictions, RPC duration)
- **Reliability:** Automatic health checks evict stale clients
- **Security:** Clear separation between admin (bypass RLS) and user (enforce RLS) clients

### Negative

- **Complexity:** Three-tier strategy requires developer understanding
- **Token handling:** Must extract user token from requests correctly

### Metrics Exposed

```
tenantflow_supabase_user_client_pool_hits_total
tenantflow_supabase_user_client_pool_misses_total
tenantflow_supabase_user_client_pool_evictions_total
tenantflow_supabase_user_client_pool_size
tenantflow_supabase_rpc_calls_total
tenantflow_supabase_rpc_duration_seconds
tenantflow_supabase_rpc_cache_hits_total
tenantflow_supabase_rpc_cache_misses_total
tenantflow_supabase_nplusone_detected_total
```

## Key Files

| File | Purpose |
|------|---------|
| `apps/backend/src/database/supabase.module.ts` | Singleton admin client via DI |
| `apps/backend/src/database/supabase.service.ts` | Main facade, lifecycle management |
| `apps/backend/src/database/supabase-user-client-pool.ts` | User client caching with TTL |
| `apps/backend/src/database/supabase-rpc.service.ts` | RPC with retries, caching |
| `apps/backend/src/database/supabase-instrumentation.service.ts` | N+1 detection, metrics |
| `apps/backend/src/database/supabase-health.service.ts` | Health check implementation |
| `apps/backend/src/database/supabase.constants.ts` | DI tokens, error codes |

## When to Use Which Client

| Scenario | Client | Why |
|----------|--------|-----|
| Stripe webhook handler | Admin | No user context, webhook data is trusted |
| User fetches their properties | User | Must enforce RLS policies |
| Background sync job | Admin | System operation, no user |
| API endpoint with JWT | User | User's token determines access |
| Health check | Admin | System diagnostic |

## References

- [Supabase Connection Management](https://supabase.com/docs/guides/database/connection-management)
- [Supabase JS Client Options](https://supabase.com/docs/reference/javascript/initializing)
- [NestJS DI Scope](https://docs.nestjs.com/fundamentals/injection-scopes)

---
*Date: 2026-01-18*
*Author: Claude (automated via Phase 18)*
