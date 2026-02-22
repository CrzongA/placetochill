-- Add social_link column to locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS social_link TEXT;

-- Update validation or comments if needed
COMMENT ON COLUMN public.locations.social_link IS 'URL to an Instagram or Threads post/reel for embedding';
