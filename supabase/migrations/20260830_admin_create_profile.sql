-- Secure server-side profile provisioning for the Admin Panel.
-- The function is callable only with the service_role key and independently
-- verifies that the admin identity supplied by the server belongs to an admin.

create or replace function public.admin_update_profile(
  p_admin_id uuid,
  p_user_id uuid,
  p_username text,
  p_role text,
  p_level public.user_level,
  p_status public.user_status,
  p_exclusive_link text default null,
  p_dashboard_link text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'Admin authorization required';
  end if;

  update public.profiles
  set username = p_username,
      role = p_role,
      level = p_level,
      status = p_status,
      exclusive_link = p_exclusive_link,
      personal_dashboard_link = p_dashboard_link
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.admin_update_profile(uuid, uuid, text, text, public.user_level, public.user_status, text, text) from public;
grant execute on function public.admin_update_profile(uuid, uuid, text, text, public.user_level, public.user_status, text, text) to service_role;
