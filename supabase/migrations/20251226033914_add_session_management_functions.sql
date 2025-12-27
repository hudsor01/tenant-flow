-- Migration: Add Session Management Functions
-- Purpose: Enable querying and revoking user sessions from auth.sessions table
-- Affected: auth.sessions table (read/delete access via SECURITY DEFINER functions)
-- Security: Functions use SECURITY DEFINER to access auth schema with elevated privileges
--           but are restricted to the calling user's own sessions

-- Function to get all sessions for a user
-- Returns sessions with id, user_id, timestamps, user_agent, and ip
create or replace function public.get_user_sessions(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip inet
)
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  -- Verify the caller is requesting their own sessions
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: can only view own sessions';
  end if;

  return query
  select
    s.id,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.user_agent,
    s.ip
  from auth.sessions s
  where s.user_id = p_user_id
  order by s.created_at desc;
end;
$$;

-- Function to revoke (delete) a specific session
-- Returns void, raises exception on failure
create or replace function public.revoke_user_session(p_user_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_session_user_id uuid;
begin
  -- Verify the caller is revoking their own session
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: can only revoke own sessions';
  end if;

  -- Verify the session belongs to the user
  select user_id into v_session_user_id
  from auth.sessions
  where id = p_session_id;

  if v_session_user_id is null then
    raise exception 'Session not found';
  end if;

  if v_session_user_id != p_user_id then
    raise exception 'Access denied: session belongs to another user';
  end if;

  -- Delete the session
  delete from auth.sessions
  where id = p_session_id
    and user_id = p_user_id;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.get_user_sessions(uuid) to authenticated;
grant execute on function public.revoke_user_session(uuid, uuid) to authenticated;

-- Add comments for documentation
comment on function public.get_user_sessions(uuid) is
  'Get all active sessions for the authenticated user. Returns session details including browser/device info.';

comment on function public.revoke_user_session(uuid, uuid) is
  'Revoke (terminate) a specific session. Users can only revoke their own sessions.';
