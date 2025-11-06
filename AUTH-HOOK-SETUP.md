# Custom Access Token Auth Hook Setup

**Status**: ✅ Enabled for local development | ⚠️ Needs verification for production
**Migration**: `supabase/migrations/20251031_auth_hook_custom_claims.sql`
**Local Config**: `supabase/config.toml:33-35`

---

## Overview

The custom access token hook runs **before** Supabase Auth issues a JWT token. It adds custom claims to the token, eliminating the need for database queries in middleware.

### Custom Claims Added

- **`user_role`**: User's role (landlord, tenant, admin)
- **`subscription_status`**: Subscription status (active, trial, canceled, etc.)
- **`stripe_customer_id`**: Stripe customer ID for billing

### Performance Impact

**Without Hook** (current production behavior if not enabled):
```typescript
// Middleware needs to query database for every request
const role = getStringClaim(claims, 'user_role')  // ❌ null
// Falls back to: await supabase.from('users').select('role')...
```

**With Hook** (recommended):
```typescript
// Claims already in JWT, no database query needed
const role = getStringClaim(claims, 'user_role')  // ✅ 'landlord'
// Zero database queries! 🚀
```

---

## Local Development Setup

### ✅ Already Configured

The hook is already enabled in `supabase/config.toml`:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

When you run `supabase start`, the local Supabase instance will:
1. Load the hook configuration
2. Run the hook function before issuing JWTs
3. Include custom claims in all access tokens

### Verify Local Setup

1. Start local Supabase:
   ```bash
   supabase start
   ```

2. Login to your app locally

3. Check JWT claims in browser DevTools:
   ```javascript
   // In browser console
   const token = document.cookie.match(/sb-.*-auth-token=([^;]+)/)?.[1]
   const payload = JSON.parse(atob(token.split('.')[1]))
   console.log(payload)
   // Should see: user_role, subscription_status, stripe_customer_id
   ```

---

## Production Setup

### Prerequisites

- [ ] Database migration `20251031_auth_hook_custom_claims.sql` applied
- [ ] Access to Supabase Dashboard (project owner or admin)

### Step 1: Verify Migration Applied

Connect to production database:

```bash
doppler run -- psql $DATABASE_URL
```

Check if hook function exists:

```sql
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'custom_access_token_hook'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

**Expected**: Function exists with the correct signature.

### Step 2: Enable Hook in Supabase Dashboard

1. **Navigate to Authentication → Hooks**
   - URL: `https://supabase.com/dashboard/project/bshjmbshupiibfiewpxb/auth/hooks`

2. **Enable Custom Access Token Hook**
   - Section: "Custom Access Token"
   - Hook Type: Select "Postgres Function"
   - Function: `public.custom_access_token_hook`
   - Click "Enable Hook"

3. **Save Configuration**
   - Click "Save" button
   - Wait for confirmation message

### Step 3: Verify Production Setup

#### Test 1: Login and Check JWT

```bash
# Login to production app
# Open browser DevTools → Application → Cookies
# Find: sb-bshjmbshupiibfiewpxb-auth-token

# Copy token value and decode at https://jwt.io
# Or use this command:
echo "YOUR_TOKEN_HERE" | cut -d. -f2 | base64 -d | jq .
```

**Expected Claims**:
```json
{
  "aud": "authenticated",
  "exp": 1234567890,
  "iat": 1234567890,
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "role": "authenticated",
  "user_role": "landlord",
  "subscription_status": "active",
  "stripe_customer_id": "cus_xxx"
}
```

#### Test 2: Check Middleware Performance

Before enabling hook:
```bash
# Check logs for database queries like:
"Fetching user role from database" (performance penalty)
```

After enabling hook:
```bash
# Logs should show:
"Using role from JWT claims" (no database query)
```

### Step 4: Monitor After Enabling

1. **Check Error Logs**
   ```bash
   # Supabase Dashboard → Logs → Auth
   # Filter for errors related to custom_access_token_hook
   ```

2. **Verify Hook Execution**
   ```sql
   -- Check users table has the required fields
   SELECT
     "supabaseId",
     role,
     subscription_status,
     "stripeCustomerId"
   FROM users
   LIMIT 5;
   ```

3. **Test Authentication Flow**
   - Login with test user
   - Verify JWT includes custom claims
   - Check middleware logs for reduced database queries

---

## Troubleshooting

### Issue: Hook Not Running

**Symptoms**: JWT doesn't include custom claims

**Solutions**:
1. Verify hook is enabled in Supabase Dashboard
2. Check migration was applied: `SELECT * FROM pg_proc WHERE proname = 'custom_access_token_hook';`
3. Verify permissions: `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'users' AND grantee = 'supabase_auth_admin';`
4. Check RLS policy: `SELECT * FROM pg_policies WHERE policyname = 'Allow auth admin to read user roles';`

### Issue: Hook Returns Error

**Symptoms**: Authentication fails after enabling hook

**Check Hook Logs**:
```bash
# Supabase Dashboard → Database → Functions
# Find: custom_access_token_hook
# View execution logs
```

**Common Errors**:
- **User not found**: User exists in auth.users but not in public.users → Run user sync
- **Permission denied**: supabase_auth_admin can't read users table → Check grants
- **NULL claims**: Users table missing required columns → Run migrations

### Issue: Performance Not Improved

**Symptoms**: Database queries still happening in middleware

**Verify**:
1. JWT actually includes custom claims (decode token)
2. Middleware code is checking claims first (see `middleware.ts:106-108`)
3. Claims have correct structure (not 'null' strings)

**Debug Code**:
```typescript
// Add to middleware.ts for debugging
console.log('JWT Claims:', {
  user_role: getStringClaim(claims, 'user_role'),
  subscription_status: getStringClaim(claims, 'subscription_status'),
  stripe_customer_id: getStringClaim(claims, 'stripe_customer_id')
})
```

---

## Rollback Procedure

If hook causes issues in production:

### Option 1: Disable Hook (Quick)

1. Supabase Dashboard → Authentication → Hooks
2. Find "Custom Access Token" section
3. Click "Disable Hook"
4. Save configuration

**Impact**: Middleware will fall back to database queries (slower but functional)

### Option 2: Remove Migration (Complete)

```bash
doppler run -- psql $DIRECT_URL
```

```sql
-- Drop the policy
DROP POLICY IF EXISTS "Allow auth admin to read user roles" ON public.users;

-- Revoke permissions
REVOKE ALL ON TABLE public.users FROM supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM supabase_auth_admin;

-- Drop the function
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);
```

---

## References

- **Migration**: `supabase/migrations/20251031_auth_hook_custom_claims.sql`
- **Local Config**: `supabase/config.toml:33-35`
- **Usage**: `apps/frontend/src/lib/supabase/middleware.ts:106-108`
- **Supabase Docs**: [Custom Access Token Hook Guide](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- **Phase 4 Plan**: `PHASE-4-PLAN.md` Task 4.1.5

---

## Next Steps

- [ ] Verify migration applied to production database
- [ ] Enable hook in Supabase Dashboard
- [ ] Test JWT includes custom claims
- [ ] Monitor performance improvement
- [ ] Update Phase 4 checklist with completion status
