-- Stem — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).

-- 1. Profiles: one row per team member, linked to Supabase's built-in auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  role text default 'sales' check (role in ('admin', 'manager', 'sales', 'trimmer')),
  permissions jsonb default '{"receive": false, "delete": false, "reports": false, "catalog": false}'::jsonb,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Authenticated users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Admins can manage all profiles"
  on public.profiles for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 2. Auto-create a profile row whenever someone signs up.
--    The very first person to ever sign up becomes admin automatically.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role, permissions)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'sales' end,
    '{"receive": false, "delete": false, "reports": false, "catalog": false}'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Shared app data — one JSON blob holding batches, shipments, orders, trim logs,
--    rooms, strains, distribution email, and shipper info.
--    Simple and effective for a small team; every authenticated user can read/write it.
create table if not exists public.app_state (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

insert into public.app_state (id, data)
values (1, '{
  "batches": [],
  "shipments": [],
  "orders": [],
  "trimLogs": [],
  "rooms": {
    "daddyspipes": ["Room 1", "Room 2", "Room 3", "Room 4", "Show Room"],
    "merc": ["F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","F13","F14","F15"]
  },
  "strains": [],
  "distributionEmail": "",
  "shipper": {
    "name": "Daddy'\''s Pipes, Inc.",
    "address": "7040 Hayvenhurst Ave. Van Nuys CA 91406",
    "license": "C12-0000092-LIC",
    "contact": ""
  }
}'::jsonb)
on conflict (id) do nothing;

alter table public.app_state enable row level security;

create policy "Authenticated users can read app state"
  on public.app_state for select
  to authenticated
  using (true);

create policy "Authenticated users can update app state"
  on public.app_state for update
  to authenticated
  using (true);
