-- =============================================================
-- Phase 5: User management RPCs for tenant admins
-- =============================================================

-- Assign an existing auth.users entry to a tenant — callable by
-- platform_admin (any tenant) OR tenant admin (their own tenant only).
create or replace function public.tenant_add_user(
  p_tenant_id uuid,
  p_email text,
  p_role text default 'utilizador'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid;
begin
  if p_role not in ('admin','utilizador') then raise exception 'Role invalido'; end if;

  -- Authorization: platform admin OR admin of this tenant
  if not (
    public.is_platform_admin()
    or exists (
      select 1 from public.tenant_users
       where user_id = auth.uid()
         and tenant_id = p_tenant_id
         and role = 'admin'
         and status = 'active'
    )
  ) then
    raise exception 'Acesso negado';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then
    raise exception 'Utilizador com email % nao existe. Crie a conta primeiro.', p_email;
  end if;

  insert into public.tenant_users (tenant_id, user_id, role, status, invited_by)
  values (p_tenant_id, v_user_id, p_role, 'active', auth.uid())
  on conflict (tenant_id, user_id) do update
     set role = excluded.role, status = 'active';

  update public.profiles
     set status = 'active',
         role = p_role
   where id = v_user_id;

  return v_user_id;
end;
$$;

grant execute on function public.tenant_add_user(uuid, text, text) to authenticated;
