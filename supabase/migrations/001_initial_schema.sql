-- ============================================================
-- 001_initial_schema.sql
-- Creates profiles, properties, and jobs tables with RLS.
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- Mirrors auth.users; role is either 'host' or 'cleaner'.
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('host', 'cleaner')),
  full_name   text not null,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read and update only their own profile.
create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

-- ------------------------------------------------------------
-- properties
-- Owned by a host (profiles.role = 'host').
-- ------------------------------------------------------------
create table public.properties (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  address     text not null,
  created_at  timestamptz not null default now()
);

alter table public.properties enable row level security;

-- Hosts can manage only their own properties.
create policy "properties: host select"
  on public.properties for select
  using (auth.uid() = owner_id);

create policy "properties: host insert"
  on public.properties for insert
  with check (auth.uid() = owner_id);

create policy "properties: host update"
  on public.properties for update
  using (auth.uid() = owner_id);

create policy "properties: host delete"
  on public.properties for delete
  using (auth.uid() = owner_id);

-- ------------------------------------------------------------
-- jobs
-- Linked to a property; optionally assigned to a cleaner.
-- ------------------------------------------------------------
create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties (id) on delete cascade,
  cleaner_id      uuid references public.profiles (id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending', 'in_progress', 'completed')),
  scheduled_date  date not null,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.jobs enable row level security;

-- Hosts can manage jobs that belong to their properties.
create policy "jobs: host select"
  on public.jobs for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = jobs.property_id
        and p.owner_id = auth.uid()
    )
  );

create policy "jobs: host insert"
  on public.jobs for insert
  with check (
    exists (
      select 1 from public.properties p
      where p.id = jobs.property_id
        and p.owner_id = auth.uid()
    )
  );

create policy "jobs: host update"
  on public.jobs for update
  using (
    exists (
      select 1 from public.properties p
      where p.id = jobs.property_id
        and p.owner_id = auth.uid()
    )
  );

create policy "jobs: host delete"
  on public.jobs for delete
  using (
    exists (
      select 1 from public.properties p
      where p.id = jobs.property_id
        and p.owner_id = auth.uid()
    )
  );

-- Cleaners can only see jobs assigned to them.
create policy "jobs: cleaner select"
  on public.jobs for select
  using (auth.uid() = cleaner_id);
