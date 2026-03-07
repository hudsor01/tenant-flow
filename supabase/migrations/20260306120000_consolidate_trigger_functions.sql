-- =============================================================================
-- migration: consolidate_trigger_functions
-- purpose: DB-12 -- consolidate duplicate updated_at trigger functions
-- affected: all tables with updated_at triggers using update_updated_at_column()
-- description:
--   two trigger functions exist for the same purpose:
--     1. set_updated_at() -- base schema, has SET search_path = public
--     2. update_updated_at_column() -- created in blogs + optimization migrations
--   this migration reassigns all triggers to use set_updated_at() and drops
--   the duplicate. this is both a dedup and a security improvement (search_path).
-- =============================================================================

-- step 1: dynamically find and reassign all triggers using update_updated_at_column()
-- to use set_updated_at() instead. this must happen BEFORE dropping the function.
do $$
declare
  v_trigger record;
  v_count integer := 0;
begin
  for v_trigger in
    select tg.tgname as trigger_name, cl.relname as table_name
    from pg_trigger tg
    join pg_class cl on cl.oid = tg.tgrelid
    join pg_proc p on p.oid = tg.tgfoid
    join pg_namespace ns on ns.oid = cl.relnamespace
    where p.proname = 'update_updated_at_column'
      and ns.nspname = 'public'
  loop
    -- drop the old trigger referencing update_updated_at_column
    execute format(
      'drop trigger if exists %I on public.%I',
      v_trigger.trigger_name, v_trigger.table_name
    );

    -- recreate using the canonical set_updated_at() function
    -- use consistent trigger name across all tables
    execute format(
      'create trigger set_updated_at
        before update on public.%I
        for each row execute function public.set_updated_at()',
      v_trigger.table_name
    );

    v_count := v_count + 1;
    raise notice 'reassigned trigger on table: %', v_trigger.table_name;
  end loop;

  raise notice 'total triggers reassigned: %', v_count;
end;
$$;

-- step 2: drop the duplicate function
-- DESTRUCTIVE: this permanently removes update_updated_at_column()
-- all triggers have been reassigned above, so no references remain
drop function if exists public.update_updated_at_column();

-- step 3: also drop any duplicate set_updated_at triggers that may exist
-- (some tables might already have both a set_updated_at and update_*_updated_at trigger)
do $$
declare
  v_dup record;
begin
  -- find tables that now have multiple triggers calling set_updated_at
  for v_dup in
    select cl.relname as table_name, tg.tgname as trigger_name,
           row_number() over (partition by cl.relname order by tg.tgname) as rn
    from pg_trigger tg
    join pg_class cl on cl.oid = tg.tgrelid
    join pg_proc p on p.oid = tg.tgfoid
    join pg_namespace ns on ns.oid = cl.relnamespace
    where p.proname = 'set_updated_at'
      and ns.nspname = 'public'
      and not tg.tgisinternal
  loop
    -- keep only the first trigger (set_updated_at), drop any extras
    if v_dup.rn > 1 then
      execute format(
        'drop trigger if exists %I on public.%I',
        v_dup.trigger_name, v_dup.table_name
      );
      raise notice 'dropped duplicate trigger % on %', v_dup.trigger_name, v_dup.table_name;
    end if;
  end loop;
end;
$$;

-- =============================================================================
-- verification queries (run manually to confirm):
-- verify: select proname from pg_proc where proname = 'update_updated_at_column' and pronamespace = 'public'::regnamespace;
-- expected: 0 rows
--
-- verify: select cl.relname, tg.tgname from pg_trigger tg join pg_class cl on cl.oid = tg.tgrelid join pg_proc p on p.oid = tg.tgfoid where p.proname = 'set_updated_at' and not tg.tgisinternal order by cl.relname;
-- expected: one set_updated_at trigger per table with updated_at column
-- =============================================================================
