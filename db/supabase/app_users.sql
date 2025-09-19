-- Supabase SQL for Honors Ops Auth & Roles
-- Run this script in the Supabase SQL editor after creating your project.

create type if not exists public.user_role as enum ('admin', 'staff', 'viewer');

-- 2. Create the app_users table keyed by the auth user id.
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role public.user_role not null default 'staff',
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.app_users
  add column if not exists display_name text;

-- 3. Automatically maintain updated_at on every change.
create or replace function public.set_updated_at()
returns trigger as
$$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists app_users_set_updated_at on public.app_users;

create trigger app_users_set_updated_at
  before update on public.app_users
  for each row execute procedure public.set_updated_at();

-- 4. Enable Row Level Security and define policies.
alter table public.app_users enable row level security;

-- Allow authenticated users to select their own row.
create policy "Users can view their profile"
  on public.app_users
  for select
  using (auth.uid() = id);

-- Allow authenticated users to insert their own profile (first login bootstrap).
create policy "Users can create their profile"
  on public.app_users
  for insert
  with check (auth.uid() = id);

-- Allow admins to select any profile.
create policy "Admins can view all profiles"
  on public.app_users
  for select
  using (exists (
    select 1
    from public.app_users admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  ));

-- Allow admins to update any profile.
create policy "Admins can manage profiles"
  on public.app_users
  for update
  using (exists (
    select 1
    from public.app_users admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  ))
  with check (exists (
    select 1
    from public.app_users admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  ));

-- Optional: allow admins to delete profiles (future console support).
create policy "Admins can delete profiles"
  on public.app_users
  for delete
  using (exists (
    select 1
    from public.app_users admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  ));

-- 5. Seed plan: after enabling email sign-in, invite your first admin user.
-- Replace the placeholder email below and run the update once the account exists.
-- update public.app_users
-- set role = 'admin'
-- where email = 'founder@example.com';
