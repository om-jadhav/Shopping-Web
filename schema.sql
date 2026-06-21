-- schema.sql
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Supabase already gives you an "auth.users" table for free (handles
-- password hashing, sessions, etc). This adds a "profiles" table for
-- extra info your shopping site will need, and keeps it in sync.

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default now()
);

-- Row Level Security: by default NO ONE can read/write this table.
-- These policies say "a user can only see/edit their own row".
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up via auth.users.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Example table for later (commented out for now - this is just
-- here so you can see where "products" will plug into the same MVC
-- pattern once you're ready to build that part):
--
-- create table if not exists public.products (
--   id bigint generated always as identity primary key,
--   name text not null,
--   description text,
--   price numeric(10,2) not null,
--   image_url text,
--   created_at timestamp with time zone default now()
-- );
