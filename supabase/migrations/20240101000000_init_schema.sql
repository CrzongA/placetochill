-- Enable PostGIS
create extension if not exists postgis schema extensions;

-- Create locations table
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  place_name text not null,
  address text,
  coordinates geometry(Point, 4326),
  tags text[],
  approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create comments table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.locations enable row level security;
alter table public.comments enable row level security;

-- Policies for locations
-- 1. Public can read approved locations
create policy "Public can read approved locations"
  on public.locations for select
  using ( approved = true );

-- 2. Admins can manage all locations
create policy "Admins can manage all locations"
  on public.locations for all
  to authenticated
  using ( coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true );

-- Policies for comments
-- 1. Public can read all comments
create policy "Public can read all comments"
  on public.comments for select
  using ( true );

-- 2. Authenticated users can insert their own comments
create policy "Authenticated users can insert comments"
  on public.comments for insert
  to authenticated
  with check ( auth.uid() = user_id );

-- 3. Users can manage their own comments (update/delete)
create policy "Users can update own comments"
  on public.comments for update
  to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Users can delete own comments"
  on public.comments for delete
  to authenticated
  using ( auth.uid() = user_id );

-- Create updated_at trigger for locations
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_locations_updated_at
  before update on public.locations
  for each row
  execute procedure public.handle_updated_at();
