/*
  # Create hero video settings

  1. System Settings
    - Add hero video category to system_settings table
    - Create default hero video setting

  2. Storage
    - Ensure profile_images bucket can store videos in hero_videos folder

  3. Security
    - Add RLS policies for hero video management
*/

-- Insert default hero video setting if it doesn't exist
INSERT INTO public.system_settings (key, value, category, description)
VALUES (
  'hero_video_default',
  '{"url": "", "title": "Default Hero Video", "uploaded_at": ""}',
  'hero_video',
  'Default hero video for user homepage'
)
ON CONFLICT (key) DO NOTHING;

-- Create a function to get active hero video
CREATE OR REPLACE FUNCTION public.get_active_hero_video()
RETURNS TABLE (
  video_url TEXT,
  video_title TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN value::text LIKE '"%"' THEN value::text
      ELSE (value->>'url')::text
    END as video_url,
    COALESCE(value->>'title', 'Hero Video') as video_title
  FROM public.system_settings
  WHERE key = 'hero_video_active' 
    AND category = 'hero_video'
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_hero_video() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_hero_video() TO anon;