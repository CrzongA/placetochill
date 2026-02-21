-- Allow authenticated users to view all locations (for moderation)
create policy "Admins can view all locations"
  on public.locations for select
  to authenticated
  using (true);

-- Allow public users (anon) to view only approved locations
create policy "Public can view approved locations"
  on public.locations for select
  to anon
  using (approved = true);

-- Allow authenticated users to update locations (to approve them)
create policy "Admins can update locations"
  on public.locations for update
  to authenticated
  using (true);

-- Allow authenticated users to delete locations (to reject them)
create policy "Admins can delete locations"
  on public.locations for delete
  to authenticated
  using (true);
