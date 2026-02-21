-- Tighten policies for the locations table
-- Drop old lax policies
drop policy if exists "Admins can view all locations" on public.locations;
drop policy if exists "Admins can update locations" on public.locations;
drop policy if exists "Admins can delete locations" on public.locations;

-- Create hardened admin policies using app_metadata
create policy "Admins can view all locations"
  on public.locations for select
  to authenticated
  using ( ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean) = true );

create policy "Admins can update locations"
  on public.locations for update
  to authenticated
  using ( ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean) = true );

create policy "Admins can delete locations"
  on public.locations for delete
  to authenticated
  using ( ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean) = true );

-- Ensure storage policies are also admin-aware if necessary, 
-- but for now, we keep the submission upload public as intended for the POC.
-- However, we should prevent users from deleting/overwriting objects in 'submissions' 
-- unless they are admins.

drop policy if exists "Anyone can upload photos to submissions" on storage.objects;

create policy "Anyone can upload photos to submissions"
  on storage.objects for insert
  to public
  with check ( 
    bucket_id = 'photos' 
    and (storage.foldername(name))[1] = 'submissions' 
  );

create policy "Only admins can delete photos"
  on storage.objects for delete
  to authenticated
  using ( 
    bucket_id = 'photos' 
    and ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean) = true 
  );
