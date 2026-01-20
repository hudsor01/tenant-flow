# Phase 24: Admin Client RLS Security Audit - Research

**Researched:** 2026-01-20
**Domain:** Supabase RLS bypass patterns & NestJS authorization
**Confidence:** HIGH

<research_summary>
## Summary

Researched Supabase admin client (service role key) usage patterns and when RLS bypass is legitimate vs risky. The key insight from Supabase documentation is that **service role key ALWAYS bypasses RLS**, but if a user session is set, Supabase still respects that user's RLS policies.

The codebase has 112 production admin client usages across 38 files. Analysis reveals three categories:
1. **Legitimate (12 files)**: Webhooks, auth validation, cross-user operations with explicit authorization
2. **Needs Review (26 files)**: May be convertible to user client or need ownership guards
3. **Already Protected**: Some services use `ensureOwnership()` checks before admin queries

**Primary recommendation:** For each admin client usage, either:
- Convert to `getUserClient(token)` if a user token is available
- Add ownership verification before the query if admin client is required
- Document the legitimate reason if it's a webhook/system operation
</research_summary>

<standard_stack>
## Standard Stack

### Supabase Client Types
| Client | Method | Purpose | RLS Behavior |
|--------|--------|---------|--------------|
| Admin Client | `getAdminClient()` | System operations, webhooks | **BYPASSES RLS** |
| User Client | `getUserClient(token)` | User-scoped queries | **RESPECTS RLS** |

### Authorization Patterns
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| `getUserClient(token)` | Scoped to user's data | Any query with user context |
| `ensureOwnership()` + admin | Cross-tenant access | Owner accessing tenant data |
| Admin client only | No user context | Webhooks, cron jobs, system ops |

### Existing Guards
| Guard | Location | Purpose |
|-------|----------|---------|
| `TenantOwnershipGuard` | `@repo/backend/shared/guards` | Verifies owner→tenant relationship |
| `LeaseOwnershipGuard` | `@repo/backend/shared/guards` | Verifies owner→lease relationship |
| `ensureTenantOwnedByUser()` | `tenant-query.service.ts` | Manual ownership check |
| `ensureLeaseOwner()` | `lease-signature.service.ts` | Manual lease ownership check |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: User Client (Preferred)
**What:** Use user-scoped client for all queries where user token is available
**When to use:** Any controller endpoint with `@UseGuards(JwtAuthGuard)`

```typescript
// CORRECT: User client respects RLS
@Get()
@UseGuards(JwtAuthGuard)
async findAll(@Request() req: AuthenticatedRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const client = this.supabase.getUserClient(token)

  // RLS automatically filters to user's data
  const { data } = await client.from('properties').select('*')
  return data
}
```

### Pattern 2: Ownership Check + Admin (Documented)
**What:** Verify ownership before using admin client for cross-tenant operations
**When to use:** Owner needs to access tenant data, cross-user operations

```typescript
// CORRECT: Ownership verified before admin access
// SEC-001: REVIEWED - Admin client for cross-user operation (owner → tenant)
async getTenantPaymentHistory(ownerId: string, tenantId: string) {
  // Step 1: Verify ownership BEFORE any data access
  await this.ensureTenantOwnedByUser(ownerId, tenantId)

  // Step 2: Now safe to use admin client
  const client = this.supabase.getAdminClient()
  const { data } = await client
    .from('rent_payments')
    .select('*')
    .eq('tenant_id', tenantId)
  return data
}
```

### Pattern 3: Webhook Handler (Legitimate Bypass)
**What:** Webhooks have no user context, admin client is required
**When to use:** External system callbacks (Stripe, DocuSeal)

```typescript
// CORRECT: Webhook handler - no user context available
// Admin client is the ONLY option for external webhooks
async handleStripeWebhook(event: Stripe.Event) {
  // Webhook secret already validated by controller guard
  const client = this.supabase.getAdminClient()

  // Record webhook event (no RLS possible)
  await client.from('webhook_events').insert({ event_id: event.id })
}
```

### Anti-Patterns to Avoid

```typescript
// BAD: Admin client when user token is available
@Get(':id')
@UseGuards(JwtAuthGuard)
async findOne(@Param('id') id: string) {
  const client = this.supabase.getAdminClient() // WRONG!
  // Should use getUserClient(token) instead
}

// BAD: Admin client without ownership verification
async getTenantData(tenantId: string) {
  const client = this.supabase.getAdminClient()
  // No ownership check - ANY tenant data accessible!
  const { data } = await client.from('tenants').select('*').eq('id', tenantId)
}

// BAD: No documentation for legitimate admin usage
async someSystemOperation() {
  const client = this.supabase.getAdminClient()
  // Why admin? Not documented - unclear if intentional
}
```
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User data filtering | Manual WHERE clauses with admin client | `getUserClient(token)` | RLS handles it automatically, fewer bugs |
| Ownership checks | Inline if/throw statements | `TenantOwnershipGuard` or `ensureOwnership()` | Consistent, testable, reusable |
| Cross-tenant queries | Raw admin queries | RPC functions with ownership param | Database enforces constraints |
| Token extraction | Manual header parsing | `AuthenticatedRequest.user` | Framework handles it |

**Key insight:** RLS was designed to handle multi-tenant data isolation. Every admin client usage is a potential RLS bypass. The audit should minimize admin client usage, not normalize it.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Admin Client for Convenience
**What goes wrong:** Developer uses admin client because "it's simpler" - no token management
**Why it happens:** User client requires passing tokens through service layers
**How to avoid:** Always pass token from controller to service; prefer user client by default
**Warning signs:** Admin client in services called by authenticated endpoints

### Pitfall 2: Missing Ownership Check
**What goes wrong:** Admin client bypasses RLS, returns ANY tenant's data
**Why it happens:** Ownership verification forgotten or assumed to be handled elsewhere
**How to avoid:** Add `ensure*OwnedByUser()` call BEFORE any admin client query
**Warning signs:** Admin client with `.eq('tenant_id', tenantId)` but no ownership verification

### Pitfall 3: Token Available But Not Used
**What goes wrong:** Controller has JWT but service uses admin client anyway
**Why it happens:** Service written before user client pattern was established
**How to avoid:** Audit call chain from controller - if token exists, use it
**Warning signs:** `@UseGuards(JwtAuthGuard)` but downstream service uses `getAdminClient()`

### Pitfall 4: Undocumented Admin Usage
**What goes wrong:** Unclear if admin usage is intentional or accidental
**Why it happens:** No convention for documenting legitimate bypass scenarios
**How to avoid:** Add `// SEC-XXX: REVIEWED - reason` comment for legitimate admin usage
**Warning signs:** Admin client without any documentation explaining why
</common_pitfalls>

<code_examples>
## Code Examples

### Converting Admin to User Client
```typescript
// BEFORE: Admin client (bypasses RLS)
async getProperties(userId: string) {
  const client = this.supabase.getAdminClient()
  const { data } = await client
    .from('properties')
    .select('*')
    .eq('user_id', userId) // Manual filter - error-prone
  return data
}

// AFTER: User client (RLS enforced)
async getProperties(token: string) {
  const client = this.supabase.getUserClient(token)
  const { data } = await client
    .from('properties')
    .select('*')
  // RLS automatically filters by authenticated user
  return data
}
```

### Adding Ownership Verification
```typescript
// BEFORE: No ownership check (DANGEROUS)
async getTenantDetails(tenantId: string) {
  const client = this.supabase.getAdminClient()
  return client.from('tenants').select('*').eq('id', tenantId).single()
}

// AFTER: Ownership verified first
async getTenantDetails(ownerId: string, tenantId: string) {
  // SEC-008: Verify owner has access to this tenant
  await this.ensureTenantOwnedByUser(ownerId, tenantId)

  const client = this.supabase.getAdminClient()
  return client.from('tenants').select('*').eq('id', tenantId).single()
}
```

### Documenting Legitimate Admin Usage
```typescript
/**
 * LeaseSignatureService
 *
 * SEC-001: REVIEWED - getAdminClient() usage is INTENTIONAL for cross-user operations.
 * Authorization is enforced via ensureLeaseOwner/ensureLeaseStatus checks before writes.
 * Tenant signing owner's lease requires RLS bypass with explicit authz validation.
 */
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Optional token params | Required token params | v3.0 | Forces user client usage |
| Admin client + manual filter | User client + RLS | v2.0 | Database enforces security |
| Inline ownership checks | Guard decorators | v1.0 | Consistent authz pattern |

**Supabase Recommendations (from official docs):**
- Service role key should ONLY be used on trusted server
- Even with service key, Supabase respects signed-in user's RLS if session set
- For multi-tenant, prefer RLS over application-level filtering

**Project-Specific Patterns:**
- ADR-0004: Three-tier client strategy (admin, user pool, anon)
- ADR-0005: RPC-first for complex operations (ownership checked in DB)
</sota_updates>

<open_questions>
## Open Questions

1. **Stripe schema queries**
   - What we know: Many services query `stripe.*` tables with admin client
   - What's unclear: Does RLS apply to stripe schema tables?
   - Recommendation: Check RLS policies on stripe schema; may be intentionally open

2. **Background job context**
   - What we know: Cron jobs, listeners have no user context
   - What's unclear: Should they use service accounts with limited permissions?
   - Recommendation: Document as legitimate; consider RPC functions for complex ops
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `/websites/supabase` via Context7 - RLS bypass documentation, service role key behavior
- Supabase official docs: https://supabase.com/docs/guides/auth/row-level-security
- Codebase analysis: `apps/backend/src/database/supabase.service.ts`

### Secondary (MEDIUM confidence)
- Codebase patterns from TODO.md progress notes (already-fixed patterns)
- ADR-0004, ADR-0005 in `.planning/adr/`

### Tertiary (LOW confidence - needs validation)
- None - all findings verified against docs and codebase
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Supabase service role key, RLS policies
- Ecosystem: NestJS guards, ownership verification patterns
- Patterns: User client vs admin client selection
- Pitfalls: RLS bypass risks, missing ownership checks

**Confidence breakdown:**
- Standard stack: HIGH - verified with Supabase docs
- Architecture: HIGH - from codebase analysis
- Pitfalls: HIGH - derived from actual code patterns
- Code examples: HIGH - adapted from existing codebase

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - patterns are stable)
</metadata>

---

*Phase: 24-admin-client-rls-audit*
*Research completed: 2026-01-20*
*Ready for planning: yes*
