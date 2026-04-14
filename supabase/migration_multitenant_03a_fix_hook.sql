-- =============================================================
-- Fix: JWT hook must bypass RLS to read tenant_users / platform_admins
-- =============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  claims jsonb;
  v_user_id uuid;
  v_tenant uuid;
  v_is_platform boolean;
  v_role text;
begin
  claims := event->'claims';
  v_user_id := (event->>'user_id')::uuid;

  select tu.tenant_id, tu.role
    into v_tenant, v_role
    from public.tenant_users tu
   where tu.user_id = v_user_id and tu.status = 'active'
   order by tu.last_selected desc nulls last, tu.created_at asc
   limit 1;

  select exists (select 1 from public.platform_admins where user_id = v_user_id)
    into v_is_platform;

  claims := claims || jsonb_build_object(
    'tenant_id', v_tenant,
    'tenant_role', coalesce(v_role, ''),
    'is_platform_admin', coalesce(v_is_platform, false)
  );

  event := jsonb_set(event, '{claims}', claims);
  return event;
exception when others then
  -- On ANY error, return the event unchanged so login still works.
  -- (Safer than blocking auth; user just won't have tenant claims.)
  return event;
end;
$$;

-- Ensure supabase_auth_admin can execute; lock out everyone else
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Ensure supabase_auth_admin can read the needed tables (bypass RLS via grants + function is security definer now)
grant select on public.tenant_users to supabase_auth_admin;
grant select on public.platform_admins to supabase_auth_admin;
