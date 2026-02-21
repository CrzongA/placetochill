-- Add missing columns to locations table
alter table public.locations 
add column if not exists description text,
add column if not exists google_maps_landmark text,
add column if not exists photo_url text;

-- Allow public users (anon) to insert into locations table
create policy "Anyone can submit a new location"
  on public.locations for insert
  with check (true);

-- Create storage bucket for photos if it doesn't exist
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Storage policies for the photos bucket
-- 1. Allow public uploads to the submissions folder
create policy "Anyone can upload photos to submissions"
  on storage.objects for insert
  with check ( bucket_id = 'photos' and (storage.foldername(name))[1] = 'submissions' );

-- 2. Allow public to read photos
create policy "Anyone can view photos"
  on storage.objects for select
  using ( bucket_id = 'photos' );
