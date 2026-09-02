alter table public.profiles
  add column if not exists nik text,
  add column if not exists full_name text,
  add column if not exists bank text,
  add column if not exists account_number text,
  add column if not exists address text,
  add column if not exists sponsor text,
  add column if not exists paket_join text,
  add column if not exists ahli_waris text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (
    id, username, whatsapp, nik, full_name, bank, account_number, address, sponsor, paket_join, ahli_waris, personal_dashboard_link
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data->>'whatsapp'), ''),
    nullif(trim(new.raw_user_meta_data->>'nik'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'bank'), ''),
    nullif(trim(new.raw_user_meta_data->>'account_number'), ''),
    nullif(trim(new.raw_user_meta_data->>'address'), ''),
    nullif(trim(new.raw_user_meta_data->>'sponsor'), ''),
    nullif(trim(new.raw_user_meta_data->>'paket_join'), ''),
    nullif(trim(new.raw_user_meta_data->>'ahli_waris'), ''),
    'https://dollarrise.com/lp/' || lower(regexp_replace(trim(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))), '\s+', '', 'g'))
  );
  insert into public.balances (user_id) values (new.id);
  return new;
end;
$function$;
