
export interface Producer {
  id: string;
  user_id: string;
  business_name?: string;
  social_media_links: Record<string, string>;
  id_document_url?: string;
  verification_notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  min_price_credits: number;
  max_price_credits: number;
  portfolio_tracks?: string[];
  rating: number;
  total_jobs: number;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
  profile?: {
    full_name: string;
    username: string;
  };
}

export interface ReproductionRequest {
  id: string;
  user_id: string;
  producer_id: string;
  track_id?: string;
  uploaded_track_url?: string;
  user_vocal_recording_url: string;
  track_title: string;
  special_instructions?: string;
  price_credits: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'submitted' | 'revision_requested' | 'completed' | 'rejected' | 'cancelled';
  escrow_held: boolean;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  completed_at?: string;
  final_track_url?: string;
  revision_notes?: string;
  revision_count: number;
  producer?: Producer;
  song?: {
    id: string;
    title: string;
    audio_url?: string;
  };
}

export interface ReproductionReview {
  id: string;
  reproduction_request_id: string;
  user_id: string;
  producer_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
}

export interface ProducerPayout {
  id: string;
  producer_id: string;
  reproduction_request_id: string;
  amount_credits: number;
  amount_usd: number;
  usdt_wallet_address?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string;
  transaction_hash?: string;
  created_at: string;
}
