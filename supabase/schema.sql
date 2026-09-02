-- DollarRise database foundation
create extension if not exists pgcrypto;

create type public.user_level as enum ('free','basic','premium','vip');
create type public.user_status as enum ('active','suspended');
create type public.transaction_type as enum ('credit','debit');
create type public.withdrawal_status as enum ('pending','approved','rejected','paid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'user' check (role in ('user','admin')),
  level public.user_level not null default 'free',
  status public.user_status not null default 'active',
  exclusive_link text,
  personal_dashboard_link text,
  created_at timestamptz not null default now(),
  nik text,
  full_name text,
  bank text,
  account_number text,
  address text,
  sponsor text,
  paket_join text,
  ahli_waris text,
  whatsapp text
);

create table public.balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.balance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id),
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  balance_before numeric(14,2) not null,
  balance_after numeric(14,2) not null check (balance_after >= 0),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.offer_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  offer_user_id uuid not null references public.profiles(id) on delete cascade,
  ip_hash text not null,
  reward numeric(14,2) not null default 0,
  reward_credited boolean not null default false,
  clicked_at timestamptz not null default now()
);

create index offer_clicks_user_time_idx on public.offer_clicks(user_id, clicked_at desc);
create index offer_clicks_ip_time_idx on public.offer_clicks(ip_hash, clicked_at desc);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null,
  payment_account text not null,
  status public.withdrawal_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.adsterra_settings (
  id boolean primary key default true check (id),
  publisher_id text,
  api_key text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.balance_transactions enable row level security;
alter table public.offer_clicks enable row level security;
alter table public.withdrawals enable row level security;
alter table public.adsterra_settings enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create policy "users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "users update own profile" on public.profiles for update using (id = auth.uid() or public.is_admin());
create policy "admin manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "users read own balance" on public.balances for select using (user_id = auth.uid() or public.is_admin());
create policy "admin manage balances" on public.balances for all using (public.is_admin()) with check (public.is_admin());

create policy "users read own transactions" on public.balance_transactions for select using (user_id = auth.uid() or public.is_admin());
create policy "admin create transactions" on public.balance_transactions for insert with check (public.is_admin());

create policy "users read own clicks" on public.offer_clicks for select using (user_id = auth.uid() or public.is_admin());
create policy "authenticated create clicks" on public.offer_clicks for insert with check (user_id = auth.uid());

create policy "users read own withdrawals" on public.withdrawals for select using (user_id = auth.uid() or public.is_admin());
create policy "users create withdrawals" on public.withdrawals for insert with check (user_id = auth.uid());
create policy "admin manage withdrawals" on public.withdrawals for update using (public.is_admin()) with check (public.is_admin());

create policy "admin manage adsterra settings" on public.adsterra_settings for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, username, whatsapp, nik, full_name, bank, account_number, address, sponsor, paket_join, ahli_waris
  ) values (
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
    nullif(trim(new.raw_user_meta_data->>'ahli_waris'), '')
  );
  insert into public.balances (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
