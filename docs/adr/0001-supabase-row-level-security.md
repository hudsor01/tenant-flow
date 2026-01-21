# ADR-0001: Supabase Row Level Security

## Status
Accepted

## Context
TenantFlow is a multi-tenant property management SaaS where property owners manage their own properties, units, tenants, and leases. Data isolation between owners is critical for security and compliance. We needed a strategy to ensure:

1. Each owner can only access their own data
2. Security is enforced at the database level (defense in depth)
3. The solution scales without performance degradation
4. Maintenance overhead remains manageable

### Options Considered

1. **Application-level filtering**: Add `WHERE user_id = ?` to every query
2. **Supabase Row Level Security (RLS)**: Database-enforced policies
3. **Separate databases per tenant**: Physical isolation
4. **Schema-per-tenant**: PostgreSQL schemas for isolation

## Decision
We chose **Supabase Row Level Security (RLS)** with the following implementation:

### Policy Structure
- **PERMISSIVE policies** (default) - allow access when any policy matches
- **Separate policies per operation** - SELECT, INSERT, UPDATE, DELETE
- **Separate policies per role** - `authenticated`, `anon`

### Performance Optimizations
```sql
-- Wrap auth.uid() in SELECT for query plan caching
CREATE POLICY "Users can view their properties"
ON properties FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);
```

### Ownership Chain
Properties are the root of the ownership chain:
- `properties.user_id` = owner
- `units.property_id` → properties (inherits ownership)
- `leases.unit_id` → units → properties (inherits ownership)
- `maintenance_requests.unit_id` → units → properties (inherits ownership)

### Policy Types by Operation
| Operation | Clause | Example |
|-----------|--------|---------|
| SELECT | USING only | `USING ((SELECT auth.uid()) = user_id)` |
| INSERT | WITH CHECK only | `WITH CHECK ((SELECT auth.uid()) = user_id)` |
| UPDATE | USING + WITH CHECK | Both clauses required |
| DELETE | USING only | `USING ((SELECT auth.uid()) = user_id)` |

## Consequences

### Positive
- **Defense in depth**: Even if application logic is bypassed, data is protected
- **Automatic enforcement**: No risk of forgetting WHERE clauses
- **Audit trail**: Policies are version-controlled in migrations
- **Performance**: Indexes on `user_id` columns make policies efficient

### Negative
- **Complexity**: Joins require policies on all related tables
- **Debugging**: RLS errors can be opaque (just returns empty results)
- **Testing**: Requires separate service role for integration tests

### Mitigations
- **RLS debugging**: Use `SET ROLE` to test policies in SQL
- **Integration tests**: Use service role client with `RUN_RLS_TESTS=true`
- **Policy documentation**: Comments on all policies explaining intent

## References
- `.claude/rules/rls-policies.md` - Policy writing guidelines
- `supabase/migrations/` - Policy implementations
- Supabase RLS Documentation: https://supabase.com/docs/guides/auth/row-level-security
