# Prompt for Claude (browser) — Issue #749 Migration Baseline via Supabase SQL Editor

Copy everything below the `---` line and paste into a fresh Claude conversation at https://claude.ai. The agent will walk you through using the Supabase Dashboard SQL Editor (no terminal, no CLI install) to produce a baseline migration file.

---

# Context

I'm working on issue #749 in my Next.js + Supabase project `tenant-flow`. The Supabase Preview chain-replay check has been failing because my migration chain has accumulated 5+ months of out-of-band schema drift (dashboard SQL editor changes, MCP `apply_migration` calls without git commits, manual psql DDL).

The canonical Supabase fix is to capture a single baseline migration that reflects the actual current prod schema, replace the old chain with it, and reset the migration history. Then chain replay will succeed because there's only one baseline to apply.

I want to do all the schema-extraction work via the **Supabase Dashboard SQL Editor** — NOT the local terminal, NOT the Supabase CLI. I don't want to install Docker, I don't want to type my database password, I don't want to run any CLI commands. Just SQL Editor in the browser.

**My environment:**
- Repo path: `/Users/richard/Developer/tenant-flow`
- Branch already created: `gsd/issue-749-migration-baseline-reset` (off latest `main`)
- Project ref: `bshjmbshupiibfiewpxb`
- Supabase Dashboard: https://supabase.com/dashboard/project/bshjmbshupiibfiewpxb
- SQL Editor: https://supabase.com/dashboard/project/bshjmbshupiibfiewpxb/sql/new
- I have a separate Claude Code session running locally that will handle the destructive history-reset part via Supabase MCP. This browser session is ONLY for extracting the baseline schema.

**Schema scope (from prior reconnaissance):**
- 46 public tables + 6 stripe tables = 52 tables total
- 0 views, 0 materialized views
- 112 functions in `public`
- 109 RLS policies in `public`
- 158 indexes in `public`
- 44 triggers (non-internal)
- 12 cron jobs

**What I need YOU (browser Claude) to do:**

Walk me through running a series of SQL queries in the Supabase Dashboard SQL Editor. After each query, I will paste its result back to you. You will accumulate the results into a single baseline `.sql` file that I will save locally and pass back to my Claude Code session.

ONE STEP AT A TIME. Wait for me to paste output before giving me the next query. Confirm each result looks reasonable before moving on. Do not skip steps. Do not combine queries.

## Step 1 — Open the SQL Editor

Tell me to open:
https://supabase.com/dashboard/project/bshjmbshupiibfiewpxb/sql/new

Tell me to confirm I see a "New query" tab with an empty editor. Tell me NOT to switch projects, NOT to run any prior saved queries. Just an empty editor.

## Step 2 — Sanity check schema scope

Have me run this query to confirm the schema scope matches expectations:

```sql
SELECT
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') AS public_tables,
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'stripe') AS stripe_tables,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public') AS functions,
  (SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','storage')) AS policies,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') AS indexes,
  (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal) AS triggers,
  (SELECT count(*) FROM cron.job) AS cron_jobs;
```

I'll paste the result. Confirm the counts roughly match (46 public tables, 6 stripe tables, 112 functions, 109+ policies). If they're off by more than 10%, stop and ask me to verify I'm in the right project.

## Step 3 — Extract enum types (CREATE TYPE statements)

Have me run:

```sql
SELECT
  format(
    'CREATE TYPE %I.%I AS ENUM (%s);',
    n.nspname,
    t.typname,
    string_agg(format('%L', e.enumlabel), ', ' ORDER BY e.enumsortorder)
  ) AS ddl
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname IN ('public', 'storage', 'auth')
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;
```

I'll paste the result. Save these as the `-- ENUMS` section of the baseline file (may be 0 rows — that's fine, TenantFlow per CLAUDE.md uses `text` + CHECK instead of PG enums).

## Step 4 — Extract sequences (CREATE SEQUENCE statements)

Have me run:

```sql
SELECT
  format(
    'CREATE SEQUENCE IF NOT EXISTS %I.%I AS %s START WITH %s INCREMENT BY %s MINVALUE %s MAXVALUE %s CACHE %s%s;',
    schemaname,
    sequencename,
    data_type,
    start_value,
    increment_by,
    min_value,
    max_value,
    cache_size,
    CASE WHEN cycle THEN ' CYCLE' ELSE '' END
  ) AS ddl
FROM pg_sequences
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, sequencename;
```

I'll paste the result. Save as the `-- SEQUENCES` section.

## Step 5 — Extract tables (CREATE TABLE statements)

Have me run this big one (reconstructs CREATE TABLE from pg_attribute):

```sql
WITH columns AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    a.attnum,
    format(
      '    %I %s%s%s',
      a.attname,
      format_type(a.atttypid, a.atttypmod),
      CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END,
      CASE WHEN d.adbin IS NOT NULL THEN ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid) ELSE '' END
    ) AS column_def
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_attribute a ON a.attrelid = c.oid
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE c.relkind = 'r'
    AND n.nspname IN ('public', 'stripe')
    AND a.attnum > 0
    AND NOT a.attisdropped
)
SELECT
  format(
    E'CREATE TABLE IF NOT EXISTS %I.%I (\n%s\n);',
    schema_name,
    table_name,
    string_agg(column_def, E',\n' ORDER BY attnum)
  ) AS ddl
FROM columns
GROUP BY schema_name, table_name
ORDER BY schema_name, table_name;
```

I'll paste the result. Save as the `-- TABLES` section. There should be 52 rows (46 + 6).

## Step 6 — Extract primary keys + unique constraints + check constraints

Have me run:

```sql
SELECT
  format(
    'ALTER TABLE %I.%I ADD CONSTRAINT %I %s;',
    n.nspname,
    c.relname,
    con.conname,
    pg_get_constraintdef(con.oid)
  ) AS ddl
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'stripe')
  AND con.contype IN ('p', 'u', 'c')
ORDER BY n.nspname, c.relname, con.conname;
```

I'll paste the result. Save as the `-- CONSTRAINTS (PK/UNIQUE/CHECK)` section.

## Step 7 — Extract foreign keys (separate so they come AFTER all tables exist)

Have me run:

```sql
SELECT
  format(
    'ALTER TABLE %I.%I ADD CONSTRAINT %I %s;',
    n.nspname,
    c.relname,
    con.conname,
    pg_get_constraintdef(con.oid)
  ) AS ddl
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'stripe')
  AND con.contype = 'f'
ORDER BY n.nspname, c.relname, con.conname;
```

Save as `-- FOREIGN KEYS` section.

## Step 8 — Extract indexes (skip constraint-backing ones)

Have me run:

```sql
SELECT pg_get_indexdef(i.indexrelid) || ';' AS ddl
FROM pg_index i
JOIN pg_class c ON i.indexrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'stripe')
  AND NOT i.indisprimary
  AND NOT i.indisunique
ORDER BY n.nspname, c.relname;
```

Save as `-- INDEXES` section.

## Step 9 — Extract functions (RPCs, triggers, helpers)

Have me run:

```sql
SELECT pg_get_functiondef(p.oid) || ';' AS ddl
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;
```

This may be a LARGE result (~112 functions). If the SQL Editor truncates, have me re-run with a `LIMIT 50 OFFSET 0` and then `OFFSET 50`, etc. Save as `-- FUNCTIONS` section.

## Step 10 — Extract triggers

Have me run:

```sql
SELECT pg_get_triggerdef(t.oid) || ';' AS ddl
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT t.tgisinternal
  AND n.nspname IN ('public', 'stripe')
ORDER BY n.nspname, c.relname, t.tgname;
```

Save as `-- TRIGGERS` section.

## Step 11 — Extract RLS policies (manual reconstruction)

Have me run:

```sql
SELECT
  format(
    E'CREATE POLICY %I ON %I.%I\n  AS %s\n  FOR %s\n  TO %s%s%s;',
    polname,
    schemaname,
    tablename,
    CASE WHEN permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
    cmd,
    array_to_string(roles, ', '),
    CASE WHEN qual IS NOT NULL THEN E'\n  USING (' || qual || ')' ELSE '' END,
    CASE WHEN with_check IS NOT NULL THEN E'\n  WITH CHECK (' || with_check || ')' ELSE '' END
  ) AS ddl
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, polname;
```

Save as `-- RLS POLICIES` section.

## Step 12 — Enable RLS on every table that has it

Have me run:

```sql
SELECT
  format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', n.nspname, c.relname) AS ddl
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'r'
  AND c.relrowsecurity = true
  AND n.nspname IN ('public', 'storage')
ORDER BY n.nspname, c.relname;
```

Save as `-- RLS ENABLE` section (must come BEFORE policies in the assembled file).

## Step 13 — Extract grants (privileges)

Have me run:

```sql
SELECT format(
  'GRANT %s ON %I.%I TO %I;',
  string_agg(privilege_type, ', '),
  table_schema,
  table_name,
  grantee
) AS ddl
FROM information_schema.table_privileges
WHERE table_schema IN ('public', 'storage')
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY table_schema, table_name, grantee
ORDER BY table_schema, table_name, grantee;
```

Save as `-- GRANTS` section.

## Step 14 — Extract pg_cron jobs

Have me run:

```sql
SELECT
  format(
    'SELECT cron.schedule(%L, %L, %L);',
    jobname,
    schedule,
    command
  ) AS ddl
FROM cron.job
ORDER BY jobname;
```

Save as `-- CRON JOBS` section.

## Step 15 — Assemble the baseline file

Now tell me to create the file. Tell me to open a plain text editor (VS Code / Sublime / TextEdit) and paste in the assembled file in this EXACT order, then save it as:

`/Users/richard/Developer/tenant-flow/supabase/migrations/<TIMESTAMP>_baseline_from_prod.sql`

where `<TIMESTAMP>` is right now in `YYYYMMDDHHMMSS` UTC format. Tell me to compute it from the current time (e.g. 20260528170000).

The file structure should be (with all the section headers as SQL comments):

```sql
-- Baseline migration captured from prod via Supabase SQL Editor on <DATE>
-- Issue #749: replaces the existing 244-file migration chain with a single
-- baseline that reflects the actual prod schema.

-- ============================================================================
-- SCHEMAS
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS stripe;

-- ============================================================================
-- ENUMS (from step 3)
-- ============================================================================
<paste from step 3>

-- ============================================================================
-- SEQUENCES (from step 4)
-- ============================================================================
<paste from step 4>

-- ============================================================================
-- TABLES (from step 5)
-- ============================================================================
<paste from step 5>

-- ============================================================================
-- CONSTRAINTS — PK / UNIQUE / CHECK (from step 6)
-- ============================================================================
<paste from step 6>

-- ============================================================================
-- FOREIGN KEYS (from step 7)
-- ============================================================================
<paste from step 7>

-- ============================================================================
-- INDEXES (from step 8)
-- ============================================================================
<paste from step 8>

-- ============================================================================
-- FUNCTIONS (from step 9)
-- ============================================================================
<paste from step 9>

-- ============================================================================
-- TRIGGERS (from step 10)
-- ============================================================================
<paste from step 10>

-- ============================================================================
-- RLS ENABLE (from step 12) — MUST come before policies
-- ============================================================================
<paste from step 12>

-- ============================================================================
-- RLS POLICIES (from step 11)
-- ============================================================================
<paste from step 11>

-- ============================================================================
-- GRANTS (from step 13)
-- ============================================================================
<paste from step 13>

-- ============================================================================
-- CRON JOBS (from step 14)
-- ============================================================================
<paste from step 14>
```

Tell me to verify the file is at least 3,000 lines (probably 5,000-10,000) and that it ends with a cron.schedule statement.

## Step 16 — Hand off to Claude Code

Tell me to go back to my Claude Code session and tell it:

> "Baseline file written to `supabase/migrations/<TIMESTAMP>_baseline_from_prod.sql` (<N> lines). Verify it, then proceed with step 2: git rm the old chain + reset prod's supabase_migrations.schema_migrations history table via MCP."

The Claude Code session will handle the destructive prod-history reset via Supabase MCP (it has direct DB access via the supabase MCP server). I do NOT want you (browser Claude) to give me any SQL that modifies `supabase_migrations.schema_migrations`. That's the Claude Code session's job.

## Safety rules

- **No CLI commands.** No `supabase` command, no `psql`, no `pg_dump`, no `bun`/`npm`, no Docker. Only SQL Editor queries.
- **No data queries.** Do NOT have me run `SELECT * FROM <table>` against any business table. We are only extracting schema metadata from `pg_catalog`, `pg_class`, `pg_proc`, `pg_policies`, `information_schema`, `cron.job`.
- **No mutations.** Do NOT have me run any `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, or `TRUNCATE` statement in this session. Only `SELECT`. The destructive work happens in the Claude Code session.
- **No `supabase_migrations.schema_migrations` modifications.** That table is reserved for the Claude Code session.
- **No personally-identifying queries.** Do not have me query `users`, `tenants`, `auth.users`, or any table with user data. We don't need that data — we only need schema.
- **If a query returns 0 rows**, don't assume something is broken. Some sections (like enums) may legitimately be empty.
- **If a query errors**, stop and tell me what you see. Don't try a different query without telling me what was wrong with the first one.
- **If the SQL Editor truncates a result** (it may cap at ~1MB or 10,000 rows display), tell me to add `LIMIT N OFFSET M` and re-run in chunks.
- **Don't have me edit the baseline file content by hand** other than to wrap the pasted results in the section headers.

Start with Step 1.
