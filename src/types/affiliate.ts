
export interface AffiliateLink {
  id: string;
  affiliate_user_id: string;
  link_code: string;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateWallet {
  id: string;
  affiliate_user_id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  usdt_wallet_address?: string;
  created_at: string;
  updated_at: string;
}

export interface AffiliateEarning {
  id: string;
  affiliate_user_id: string;
  referred_user_id: string;
  earning_type: 'free_referral' | 'subscription_commission';
  amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
  profile?: {
    full_name?: string;
    username?: string;
  };
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  referrer_affiliate_id?: string;
  created_at: string;
  metadata?: any;
}
