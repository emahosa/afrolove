
// Local type definitions to extend affiliate types
export interface AffiliateWalletExtended {
  id: string;
  affiliate_user_id: string;
  usdt_wallet_address: string | null;
  pending_balance: number;
  paid_balance: number;
  lifetime_earnings: number;
  balance: number; // Add the balance property that's missing
}

export interface AffiliateEarningExtended {
  id: string;
  referred_user_id: string;
  amount_earned: number;
  created_at: string;
  profile?: {
    full_name?: string;
  };
  type: 'subscription' | 'free_referral';
  status: 'cleared' | 'pending' | 'paid';
}

export interface AffiliateStatsExtended {
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  clicksCount: number;
}
