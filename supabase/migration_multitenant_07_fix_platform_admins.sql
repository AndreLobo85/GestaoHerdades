-- Only andreglobo85@gmail.com should be a platform admin.
-- Clear and re-insert to be deterministic.

delete from public.platform_admins
 where user_id not in (
   select id from auth.users where lower(email) = 'andreglobo85@gmail.com'
 );

insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'andreglobo85@gmail.com'
on conflict (user_id) do nothing;
