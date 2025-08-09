// Based on the repaired Supabase functions and actual database schema

export interface AffiliateLink {
  id: string;
  url: string;
  referral_code: string;
  clicks_count: number; // This will be populated from stats
  created_at: string;
}

export interface AffiliateWallet {
  id: string;
  affiliate_user_id: string;
  usdt_wallet_address: string | null;
  pending_balance: number;
  paid_balance: number;
  lifetime_earnings: number;
}

export interface AffiliateEarning {
  id: string;
  referred_user_id: string;
  amount_earned: number;
  created_at: string;
  // Joined data from profiles table
  profile?: {
    full_name?: string;
  };
  // Fields added for frontend compatibility
  type: 'subscription' | 'free_referral';
  status: 'cleared' | 'pending' | 'paid';
}

export interface AffiliateStats {
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  clicksCount: number;
}
