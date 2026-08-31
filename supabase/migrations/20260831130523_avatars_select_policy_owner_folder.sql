-- The avatars bucket had no SELECT policy, so nobody could enumerate it.
--
-- WHAT THIS BREAKS TODAY. src/hooks/api/use-profile-avatar-mutations.ts:79
-- calls `.list(user.id)` to find a user's previous avatars and delete them.
-- With RLS enabled and no SELECT policy the call SUCCEEDS and returns [], so
-- `paths.length` is 0 and nothing is ever removed. The surrounding try/catch is
-- labelled "storage cleanup is best-effort" and swallows nothing, because there
-- is no error -- the enumeration simply returns empty. Every avatar a user has
-- ever uploaded is orphaned permanently, in the same bucket Phase 54's storage
-- quota meters. Measured before this migration: 138 avatar objects for a single
-- owner, and zero users currently holding an avatar_url.
--
-- WHY IT WENT UNNOTICED. The bucket is public=true, so objects are readable by
-- URL and every user-visible avatar renders correctly -- verified: a direct GET
-- on an object returns 200 while list() on the same prefix returns []. Public
-- read and enumeration are different operations, and only the second is
-- governed by RLS on storage.objects. Nothing in the app reads the list result
-- except this cleanup path, whose failure is silent by construction.
--
-- The DELETE, INSERT and UPDATE policies already existed and use exactly this
-- predicate; SELECT was simply absent. This adds the missing sibling, scoped
-- identically, so a user can enumerate their own folder and nobody else's.
--
-- The auth.uid() subselect wrapping matches the house convention (CLAUDE.md) and
-- the three existing avatar policies verbatim.
create policy "Users can view their own avatar"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );
