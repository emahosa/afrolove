-- Create winner details table
CREATE TABLE public.winner_claim_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL,
  user_id UUID NOT NULL,
  winner_rank INTEGER NOT NULL DEFAULT 1,
  full_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  social_media_link TEXT,
  bank_account_details TEXT NOT NULL,
  prize_claimed BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_reviewed BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on winner_claim_details
ALTER TABLE public.winner_claim_details ENABLE ROW LEVEL SECURITY;

-- Create policies for winner_claim_details
CREATE POLICY "Users can insert their own claim details" 
ON public.winner_claim_details 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own claim details" 
ON public.winner_claim_details 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own claim details" 
ON public.winner_claim_details 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all claim details" 
ON public.winner_claim_details 
FOR ALL 
USING (has_role('admin'::user_role));

-- Add trigger for updating timestamp
CREATE TRIGGER update_winner_claim_details_updated_at
BEFORE UPDATE ON public.winner_claim_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add winner_announced_at column to contests table if it doesn't exist
ALTER TABLE public.contests 
ADD COLUMN IF NOT EXISTS winner_announced_at TIMESTAMP WITH TIME ZONE;