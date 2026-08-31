-- Cache the latest Adsterra statistics by offer, not by logged-in user.
create table if not exists public.offer_adsterra_stats_cache (
  offer_id uuid primary key references public.offers(id) on delete cascade,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  ctr numeric(12,4) not null default 0,
  cpm numeric(12,6) not null default 0,
  revenue numeric(18,6) not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists offer_adsterra_stats_updated_idx
  on public.offer_adsterra_stats_cache(updated_at desc);

alter table public.offer_adsterra_stats_cache enable row level security;

drop policy if exists "authenticated read offer Adsterra stats" on public.offer_adsterra_stats_cache;
create policy "authenticated read offer Adsterra stats"
on public.offer_adsterra_stats_cache
for select to authenticated
using (exists (
  select 1 from public.offers o
  where o.id = offer_adsterra_stats_cache.offer_id
    and (o.status = 'active' or public.is_admin())
));

drop policy if exists "admins manage offer Adsterra stats" on public.offer_adsterra_stats_cache;
create policy "admins manage offer Adsterra stats"
on public.offer_adsterra_stats_cache
for all to authenticated
using (public.is_admin())
with check (public.is_admin());
