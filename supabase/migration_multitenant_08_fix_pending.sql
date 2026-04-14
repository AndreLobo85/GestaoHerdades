-- Platform admins should not appear in the "pending users" list.
create or replace function public.admin_list_pending_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  profile_status text,
  created_at timestamptz
) language sql stable security definer set search_path = public as $func$
  select p.id, au.email, p.full_name, p.status, p.created_at
    from public.profiles p
    join auth.users au on au.id = p.id
   where public.is_platform_admin()
     and not exists (
       select 1 from public.tenant_users tu
        where tu.user_id = p.id and tu.status = 'active'
     )
     and not exists (
       select 1 from public.platform_admins pa
        where pa.user_id = p.id
     )
   order by p.created_at desc;
$func$;
