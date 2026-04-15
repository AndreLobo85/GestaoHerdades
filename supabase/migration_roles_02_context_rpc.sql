-- =============================================================
-- Dynamic Roles — Phase B (light): RPC for frontend to load my permissions.
-- We keep RLS tenant-scoped for now; fine-grained control is enforced
-- client-side via can() and server-side for mutations in later phases.
-- =============================================================

create or replace function public.get_my_permissions()
returns table (module_key text, action text, allowed boolean)
language sql stable security definer set search_path = public as $func_getperms$
  -- Platform admin: synthesize full-access permissions
  select m.module_key, a.action, true as allowed
    from (select unnest(array['activities','fuel','feed','stock','expenses','vehicles','employees','users','tenant']) as module_key) m
   cross join (select unnest(array['view','create','edit','delete','export','manage','invite','manage_roles','settings']) as action) a
   where public.is_platform_admin()

  union all

  -- Normal user: permissions from their role in the current tenant
  select p.module_key, p.action, p.allowed
    from public.tenant_users tu
    join public.tenant_role_permissions p on p.role_id = tu.role_id
   where tu.user_id = auth.uid()
     and tu.tenant_id = public.current_tenant_id()
     and tu.status = 'active'
     and not public.is_platform_admin();
$func_getperms$;

grant execute on function public.get_my_permissions() to authenticated;
