# Database Package

This package now only ships shared database utilities (for example `src/health.ts`).

> **Canonical migration location**
>
> All Supabase CLI configuration and SQL migrations live in the root `supabase/` directory.
> That folder is the single source of truth used by `supabase db` commands, CI deploy scripts,
> and Doppler-powered workflows.
>
> The legacy copies under `packages/database/migrations/` and `packages/database/config.toml`
> have been removed to avoid drift. The `migrations` entry in this package is now a symbolic link
> to `supabase/migrations` so both historical tooling and new Supabase CLI commands resolve the
> same files.

If you need to run database tasks:

1. `cd supabase`
2. Use the Supabase CLI directly (`supabase migration new`, `supabase db push`, etc.)

Any package-level scripts that previously assumed migrations existed here should be updated to
call the Supabase CLI in the root directory instead.
