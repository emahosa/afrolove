
-- Create enum types for producer and reproduction request statuses
CREATE TYPE producer_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE reproduction_status AS ENUM ('pending', 'accepted', 'in_progress', 'submitted', 'revision_requested', 'completed', 'rejected', 'cancelled');

-- Create producers table
CREATE TABLE public.producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT,
  social_media_links JSONB DEFAULT '{}',
  id_document_url TEXT,
  verification_notes TEXT,
  status producer_status DEFAULT 'pending',
  min_price_credits INTEGER DEFAULT 500,
  max_price_credits INTEGER DEFAULT 5000,
  portfolio_tracks TEXT[],
  rating NUMERIC(3,2) DEFAULT 0.0,
  total_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

-- Create reproduction_requests table
CREATE TABLE public.reproduction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  producer_id UUID REFERENCES public.producers(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES public.songs(id),
  uploaded_track_url TEXT,
  user_vocal_recording_url TEXT NOT NULL,
  track_title TEXT NOT NULL,
  special_instructions TEXT,
  price_credits INTEGER NOT NULL,
  status reproduction_status DEFAULT 'pending',
  escrow_held BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  final_track_url TEXT,
  revision_notes TEXT,
  revision_count INTEGER DEFAULT 0
);

-- Create reproduction_reviews table
CREATE TABLE public.reproduction_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reproduction_request_id UUID REFERENCES public.reproduction_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  producer_id UUID REFERENCES public.producers(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create producer_payouts table
CREATE TABLE public.producer_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID REFERENCES public.producers(id) ON DELETE CASCADE NOT NULL,
  reproduction_request_id UUID REFERENCES public.reproduction_requests(id) ON DELETE CASCADE NOT NULL,
  amount_credits INTEGER NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  usdt_wallet_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproduction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproduction_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for producers table
CREATE POLICY "Users can view approved producers" ON public.producers
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create their own producer profile" ON public.producers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own producer profile" ON public.producers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all producers" ON public.producers
  FOR ALL USING (has_role('admin'::user_role));

-- RLS Policies for reproduction_requests table  
CREATE POLICY "Users can view their own requests" ON public.reproduction_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.producers WHERE id = producer_id
  ));

CREATE POLICY "Users can create reproduction requests" ON public.reproduction_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and producers can update their requests" ON public.reproduction_requests
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT user_id FROM public.producers WHERE id = producer_id)
  );

CREATE POLICY "Admins can manage all requests" ON public.reproduction_requests
  FOR ALL USING (has_role('admin'::user_role));

-- RLS Policies for reproduction_reviews table
CREATE POLICY "Users can view all reviews" ON public.reproduction_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for their requests" ON public.reproduction_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews" ON public.reproduction_reviews
  FOR ALL USING (has_role('admin'::user_role));

-- RLS Policies for producer_payouts table
CREATE POLICY "Producers can view their own payouts" ON public.producer_payouts
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM public.producers WHERE id = producer_id
  ));

CREATE POLICY "Admins can manage all payouts" ON public.producer_payouts
  FOR ALL USING (has_role('admin'::user_role));

-- Create indexes for better performance
CREATE INDEX idx_producers_user_id ON public.producers(user_id);
CREATE INDEX idx_producers_status ON public.producers(status);
CREATE INDEX idx_reproduction_requests_user_id ON public.reproduction_requests(user_id);
CREATE INDEX idx_reproduction_requests_producer_id ON public.reproduction_requests(producer_id);
CREATE INDEX idx_reproduction_requests_status ON public.reproduction_requests(status);
CREATE INDEX idx_producer_payouts_producer_id ON public.producer_payouts(producer_id);

-- Create storage bucket for voice recordings and final tracks
INSERT INTO storage.buckets (id, name, public) VALUES 
('reproduction-tracks', 'reproduction-tracks', false),
('producer-documents', 'producer-documents', false);

-- RLS policies for storage buckets
CREATE POLICY "Users can upload their vocal recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reproduction-tracks' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users and producers can view reproduction files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reproduction-tracks' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.uid() IN (
        SELECT p.user_id FROM public.producers p
        JOIN public.reproduction_requests rr ON rr.producer_id = p.id
        WHERE rr.user_id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "Producers can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'producer-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view producer documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'producer-documents' AND 
    has_role('admin'::user_role)
  );

-- Create function to update producer rating
CREATE OR REPLACE FUNCTION update_producer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.producers 
  SET rating = (
    SELECT COALESCE(AVG(rating), 0.0)
    FROM public.reproduction_reviews 
    WHERE producer_id = NEW.producer_id
  )
  WHERE id = NEW.producer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update producer rating on new reviews
CREATE TRIGGER update_producer_rating_trigger
  AFTER INSERT ON public.reproduction_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_producer_rating();

-- Create function to handle escrow release
CREATE OR REPLACE FUNCTION release_escrow(request_id UUID, release_to TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  request_record public.reproduction_requests;
  producer_share INTEGER;
  platform_share INTEGER;
BEGIN
  SELECT * INTO request_record FROM public.reproduction_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF release_to = 'producer' THEN
    -- Calculate shares (60% to producer, 40% to platform)
    producer_share := ROUND(request_record.price_credits * 0.6);
    platform_share := request_record.price_credits - producer_share;
    
    -- Create payout record
    INSERT INTO public.producer_payouts (
      producer_id, 
      reproduction_request_id, 
      amount_credits, 
      amount_usd
    ) VALUES (
      request_record.producer_id,
      request_id,
      producer_share,
      producer_share * 0.01
    );
    
    -- Update request status
    UPDATE public.reproduction_requests 
    SET status = 'completed', completed_at = NOW(), escrow_held = FALSE
    WHERE id = request_id;
    
  ELSIF release_to = 'user' THEN
    -- Refund to user (add credits back)
    PERFORM update_user_credits(request_record.user_id, request_record.price_credits);
    
    -- Update request status
    UPDATE public.reproduction_requests 
    SET status = 'cancelled', escrow_held = FALSE
    WHERE id = request_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
