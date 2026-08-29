-- DollarRise offers: one offer belongs to one user and can be active/inactive.
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Exclusive Offer',
  link text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_status_order_idx on public.offers(status, sort_order, created_at);
create index if not exists offers_user_idx on public.offers(user_id);

alter table public.offers enable row level security;

drop policy if exists "authenticated read active offers" on public.offers;
create policy "authenticated read active offers" on public.offers
  for select to authenticated using (status = 'active' or public.is_admin());

drop policy if exists "admin manage offers" on public.offers;
create policy "admin manage offers" on public.offers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.set_offer_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists offers_updated_at on public.offers;
create trigger offers_updated_at before update on public.offers
for each row execute procedure public.set_offer_updated_at();
