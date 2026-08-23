-- Give the storage-quota guard its own SQLSTATE, because the message does not
-- survive the Storage API.
--
-- WHAT WAS WRONG. enforce_storage_quota raised with errcode 'P0001' -- simply the
-- PL/pgSQL default for `raise exception`, so setting it bought nothing.
-- src/lib/storage-plan-limit.ts states the client contract as fact: "that prefix
-- is the ONLY quota signal that survives to StorageApiError.message". It does
-- not. A real blocked upload against production returns exactly
--
--     database error, code: P0001
--
-- with message, hint and detail all stripped by the Storage API. So the client
-- could not tell a quota block from any other trigger exception on that path,
-- and the entire Upgrade-prompt UX for uploads was unreachable. Its unit tests
-- passed because they FABRICATE an error carrying the prefix -- a shape
-- production never emits on the upload path.
--
-- The one test that would have caught it, storage-metering.rls.test.ts, had never
-- executed: the RLS suite was skipping for want of a service-role key.
--
-- WHY NOT JUST FIX THE CLIENT. There is nothing to key on. Every PL/pgSQL
-- exception reports P0001, so matching it would treat unrelated trigger errors as
-- quota blocks.
--
-- WHAT IS UNCHANGED. Message, hint and detail are untouched. They still survive
-- the PostgREST path, where mutation-error-handler.ts already distinguishes a
-- quota P0001 from any other P0001 by message -- correctly, on that path. This
-- adds a signal for the path that had none; it removes nothing.
--
-- 'PLIM1' is a valid user-defined SQLSTATE: five characters from [0-9A-Z], and
-- class 'PL' is not among the classes PostgreSQL reserves ('P0' is PL/pgSQL's,
-- and 'PL' is distinct from it).
--
-- Rewritten via pg_get_functiondef + replace so the body is never retyped: the
-- bytes that were reviewed are the bytes that ship.
do $$
declare def text; newdef text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'enforce_storage_quota';

  if def is null then
    raise exception 'enforce_storage_quota not found';
  end if;

  -- Idempotent: a re-run against an already-migrated database is a no-op.
  if def like '%errcode = ''PLIM1''%' then
    return;
  end if;

  newdef := replace(def, 'errcode = ''P0001''', 'errcode = ''PLIM1''');
  if newdef = def then
    raise exception 'expected errcode literal not found -- refusing to guess';
  end if;
  execute newdef;
end $$;
