/*
  # Fix Hero Video Settings and RLS

  1. System Settings
    - Ensure proper RLS policies for system_settings table
    - Add hero video setting if not exists

  2. Storage
    - Ensure profile_images bucket exists and has proper policies
    - Add policies for hero_videos folder

  3. Security
    - Fix RLS policies to prevent 406 errors
    - Allow admins to manage hero video settings
*/

-- Fix RLS policies for system_settings to prevent 406 errors
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Create a more permissive policy for system_settings
CREATE POLICY "Allow admin access to system settings"
ON public.system_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Ensure the profile_images bucket exists (it should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'profile_images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('profile_images', 'profile_images', true);
  END IF;
END $$;

-- Add storage policies for hero videos if they don't exist
DO $$
BEGIN
  -- Policy for uploading hero videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow admin upload to hero_videos'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow admin upload to hero_videos"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = ''profile_images'' 
      AND (storage.foldername(name))[1] = ''hero_videos''
      AND EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN (''admin'', ''super_admin'')
      )
    )';
  END IF;

  -- Policy for public read access to hero videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public read access to hero_videos'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access to hero_videos"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = ''profile_images'' 
      AND (storage.foldername(name))[1] = ''hero_videos''
    )';
  END IF;
END $$;

-- Insert default hero video setting if it doesn't exist
INSERT INTO public.system_settings (key, value, category, description)
VALUES (
  'hero_video_url',
  '',
  'homepage',
  'URL for the hero section background video'
)
ON CONFLICT (key) DO NOTHING;