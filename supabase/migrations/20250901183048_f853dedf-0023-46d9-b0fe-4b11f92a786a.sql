
-- Remove all affiliate-related tables
DROP TABLE IF EXISTS public.affiliate_withdrawals CASCADE;
DROP TABLE IF EXISTS public.affiliate_wallets CASCADE;
DROP TABLE IF EXISTS public.affiliate_referrals CASCADE;
DROP TABLE IF EXISTS public.affiliate_payout_requests CASCADE;
DROP TABLE IF EXISTS public.affiliate_links CASCADE;
DROP TABLE IF EXISTS public.affiliate_earnings CASCADE;
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.affiliate_clicks CASCADE;
DROP TABLE IF EXISTS public.affiliate_applications CASCADE;
DROP TABLE IF EXISTS public.affiliates CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;

-- Remove referrer_id column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referrer_id;

-- Create site_settings table for hero video management
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies for site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site settings" 
  ON public.site_settings 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Public can view site settings" 
  ON public.site_settings 
  FOR SELECT 
  USING (true);

-- Create contest_winners table for winner display
CREATE TABLE IF NOT EXISTS public.contest_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  contest_entry_id UUID NOT NULL REFERENCES public.contest_entries(id),
  rank INTEGER NOT NULL DEFAULT 1,
  won_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS for contest_winners
ALTER TABLE public.contest_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contest winners"
  ON public.contest_winners
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage contest winners"
  ON public.contest_winners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::user_role
    )
  );

-- Create the public-assets storage bucket for hero videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for the public-assets bucket
CREATE POLICY "Admins can upload to public-assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'public-assets' AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Anyone can view public-assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'public-assets');

CREATE POLICY "Admins can update public-assets"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'public-assets' AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can delete from public-assets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'public-assets' AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::user_role
    )
  );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_site_settings()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_site_settings();

-- Function to automatically select contest winners
CREATE OR REPLACE FUNCTION auto_select_contest_winner()
RETURNS trigger AS $$
BEGIN
  -- Only process when contest ends (status changes to 'completed')
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Insert the winner(s) - entry with highest vote count
    INSERT INTO public.contest_winners (contest_id, user_id, contest_entry_id, rank)
    SELECT 
      NEW.id,
      ce.user_id,
      ce.id,
      1
    FROM public.contest_entries ce
    WHERE ce.contest_id = NEW.id
      AND ce.approved = true
      AND ce.vote_count = (
        SELECT MAX(vote_count) 
        FROM public.contest_entries 
        WHERE contest_id = NEW.id AND approved = true
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-select winners when contest ends
CREATE TRIGGER contest_winner_selection
  AFTER UPDATE ON public.contests
  FOR EACH ROW
  EXECUTE FUNCTION auto_select_contest_winner();
