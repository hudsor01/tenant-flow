# Backend Scripts

This directory contains utility scripts for the TenantFlow backend.

## Supabase Key Validation

### `validate-supabase-keys.ts`

Validates that your Supabase credentials are correctly configured.

**Usage:**

```bash
# From the backend directory
pnpm validate:supabase

# Or from the root directory
pnpm --filter @repo/backend validate:supabase
```

**What it checks:**

1. ✅ Environment variables are set (`SUPABASE_URL`, `SB_SECRET_KEY`, etc.)
2. ✅ URL format is valid (contains "supabase")
3. ✅ Secret key format is valid (JWT format starting with "eyJ")
4. ✅ Connection test - attempts to query the database
5. ✅ API key validation - verifies the key is registered for the project

**Common Issues:**

- **"Unregistered API key"**: The `SB_SECRET_KEY` doesn't match the `SUPABASE_URL` project
  - Solution: Check your Supabase project settings at https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
  - Make sure you're using the **service_role** key (not the anon key)

- **"Missing environment variables"**: Doppler is not running
  - Solution: Run with `doppler run -- pnpm validate:supabase`

- **"Invalid URL format"**: The URL is malformed
  - Solution: Check that `SUPABASE_URL` is in the format `https://YOUR_PROJECT.supabase.co`

## Stripe Scripts

### `stripe-sync-migrate.ts`

Migrates Stripe data to the database.

**Usage:**

```bash
pnpm stripe:migrate
```

### `backfill-stripe-customers.ts`

Backfills Stripe customer data for existing users.

**Usage:**

```bash
pnpm stripe:backfill-customers
```
