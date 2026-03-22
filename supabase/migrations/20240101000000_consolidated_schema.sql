-- ============================================================================
-- CONSOLIDATED MIGRATION
-- This file combines all migrations into a single, clean schema definition
-- Removes all duplicates and conflicting policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists postgis schema extensions;

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

-- Create locations table
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  place_name text not null,
  address text,
  coordinates geometry(Point, 4326),
  tags text[],
  approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  description text,
  google_maps_landmark text,
  photo_url text,
  social_link text
);

-- Create comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add column comments
comment on column public.locations.social_link is 'URL to an Instagram or Threads post/reel for embedding';

-- ----------------------------------------------------------------------------
-- STORAGE
-- ----------------------------------------------------------------------------

-- Create storage bucket for photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to locations table
drop trigger if exists handle_locations_updated_at on public.locations;
create trigger handle_locations_updated_at
  before update on public.locations
  for each row
  execute procedure public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- Enable RLS on tables
alter table public.locations enable row level security;
alter table public.comments enable row level security;

-- ----------------------------------------------------------------------------
-- POLICIES: LOCATIONS TABLE
-- ----------------------------------------------------------------------------

-- Clean up any existing policies first
drop policy if exists "Public can read approved locations" on public.locations;
drop policy if exists "Public can view approved locations" on public.locations;
drop policy if exists "Admins can manage all locations" on public.locations;
drop policy if exists "Admins can view all locations" on public.locations;
drop policy if exists "Admins can update locations" on public.locations;
drop policy if exists "Admins can delete locations" on public.locations;
drop policy if exists "Anyone can submit a new location" on public.locations;
drop policy if exists "Public can insert new locations" on public.locations;

-- 1. Public (anon) can read approved locations
create policy "Public can read approved locations"
  on public.locations for select
  to anon
  using ( approved = true );

-- 2. Public can insert new locations (submissions are unapproved by default)
create policy "Public can insert new locations"
  on public.locations for insert
  to public
  with check ( approved = false );

-- 3. Admins can view all locations (for moderation)
create policy "Admins can view all locations"
  on public.locations for select
  to authenticated
  using ( coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true );

-- 4. Admins can update locations (to approve/modify them)
create policy "Admins can update locations"
  on public.locations for update
  to authenticated
  using ( coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true );

-- 5. Admins can delete locations (to reject them)
create policy "Admins can delete locations"
  on public.locations for delete
  to authenticated
  using ( coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true );

-- ----------------------------------------------------------------------------
-- POLICIES: COMMENTS TABLE
-- ----------------------------------------------------------------------------

-- Clean up any existing policies first
drop policy if exists "Public can read all comments" on public.comments;
drop policy if exists "Authenticated users can insert comments" on public.comments;
drop policy if exists "Users can update own comments" on public.comments;
drop policy if exists "Users can delete own comments" on public.comments;

-- 1. Public can read all comments
create policy "Public can read all comments"
  on public.comments for select
  using ( true );

-- 2. Authenticated users can insert their own comments
create policy "Authenticated users can insert comments"
  on public.comments for insert
  to authenticated
  with check ( auth.uid() = user_id );

-- 3. Users can update their own comments
create policy "Users can update own comments"
  on public.comments for update
  to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 4. Users can delete their own comments
create policy "Users can delete own comments"
  on public.comments for delete
  to authenticated
  using ( auth.uid() = user_id );

-- ----------------------------------------------------------------------------
-- POLICIES: STORAGE
-- ----------------------------------------------------------------------------

-- Clean up any existing storage policies first
drop policy if exists "Anyone can upload photos to submissions" on storage.objects;
drop policy if exists "Anyone can view photos" on storage.objects;
drop policy if exists "Only admins can delete photos" on storage.objects;

-- 1. Anyone can upload photos to submissions folder
create policy "Anyone can upload photos to submissions"
  on storage.objects for insert
  to public
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'submissions'
  );

-- 2. Anyone can view photos
create policy "Anyone can view photos"
  on storage.objects for select
  using ( bucket_id = 'photos' );

-- 3. Only admins can delete photos
create policy "Only admins can delete photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- ----------------------------------------------------------------------------
-- USER ROLES FIX
-- ----------------------------------------------------------------------------

-- Set default role for new users
alter table auth.users
alter column role set default 'authenticated';

-- Update existing users with empty or null role
update auth.users
set role = 'authenticated'
where role is null or role = '';
