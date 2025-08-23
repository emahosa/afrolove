-- Step 1: Drop old affiliate-related objects
-- Drop dependent triggers first if they exist
DROP TRIGGER IF EXISTS handle_updated_at_affiliate_applications ON public.affiliate_applications;
DROP TRIGGER IF EXISTS handle_updated_at_affiliate_payout_requests ON public.affiliate_payout_requests;

-- Drop tables
DROP TABLE IF EXISTS public.affiliate_payout_requests CASCADE;
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.affiliate_applications CASCADE;

-- Drop old columns from other tables if they exist
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'referrer_id') THEN
    ALTER TABLE public.profiles DROP COLUMN referrer_id;
  END IF;
END $$;


-- Step 2: Create helper functions for RLS
-- Function to get a custom claim from the JWT
create or replace function get_claim(uid uuid, claim text)
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb -> claim,
    (select raw_app_meta_data from auth.users where id = uid) -> claim
  )
$$;

-- Function to check if the user is an admin based on a custom claim
create or replace function is_claims_admin()
returns boolean
language plpgsql
stable
as $$
  begin
    -- Check for a claim 'is_admin' and return true if it's set to true
    if get_claim(auth.uid(), 'is_admin')::text = 'true' then
      return true;
    end if;
    -- Check for a claim 'userrole' or 'role' and return true if it is 'admin'
    if get_claim(auth.uid(), 'userrole') ->> 'role' = 'admin' then
        return true;
    end if;
    if get_claim(auth.uid(), 'role') = '"admin"' then
        return true;
    end if;

    return false;
  exception
    when others then
      return false;
  end;
$$;


-- Step 3: Create new affiliate schema as specified

-- affiliate_applications
create table if not exists affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  social_profile_url text,
  note text,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid,
  rejection_reason text,
  can_reapply_after timestamptz
);

-- affiliates (approved)
create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,                 -- e.g., "AFF5XK9Q"
  status text not null default 'approved',   -- approved | suspended
  approved_at timestamptz not null default now(),
  wallet_trc20_usdt text,                    -- payout address
  created_at timestamptz not null default now()
);

-- affiliate_clicks
create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  ts timestamptz not null default now(),
  landing_url text,
  referrer_url text,
  ip_hash text,        -- optional (hash for dedupe/analytics)
  ua_hash text
);

-- affiliate_referrals (first-touch binding)
create table if not exists affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  signup_at timestamptz, -- when user actually signed up
  unique (affiliate_id, user_id)
);

-- affiliate_free_referrals
create table if not exists affiliate_free_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_usd numeric not null default 0.10,
  created_at timestamptz not null default now(),
  unique (affiliate_id, user_id) -- only once per referred user
);

-- payments
create table if not exists payments (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_usd numeric not null,
  currency text not null default 'USD',
  provider text not null,                 -- 'stripe', 'manual', etc.
  status text not null,                   -- 'succeeded', 'refunded', etc.
  paid_at timestamptz not null
);

-- affiliate_commissions
create table if not exists affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade,
  rate numeric not null default 0.10,      -- 10%
  amount_usd numeric not null,
  status text not null default 'pending',  -- pending | approved | paid
  created_at timestamptz not null default now()
);

-- affiliate_payouts
create table if not exists affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  amount_usd numeric not null,
  wallet_trc20_usdt text not null,
  status text not null default 'requested', -- requested | sent | failed
  tx_hash text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Step 4: Alter auth.users table
alter table auth.users
  add column if not exists affiliate_lockin_id uuid references affiliates(id),
  add column if not exists affiliate_lockin_at timestamptz,
  add column if not exists signup_at timestamptz;

-- Step 5: Create helper function for idempotent referral insertion
create or replace function ensure_affiliate_referral(p_affiliate_id uuid, p_user_id uuid)
returns void language plpgsql as $$
begin
  insert into affiliate_referrals (affiliate_id, user_id, signup_at)
  values (p_affiliate_id, p_user_id, now())
  on conflict (affiliate_id, user_id) do update set signup_at = coalesce(affiliate_referrals.signup_at, excluded.signup_at);
end; $$;

-- Step 6: Setup Row Level Security (RLS)
-- Helper function to get the current user's affiliate ID
create or replace function get_my_affiliate_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from affiliates where user_id = auth.uid();
$$;

-- RLS Policies
-- affiliate_applications
alter table affiliate_applications enable row level security;
create policy "user_can_insert_own_app" on affiliate_applications for insert to authenticated with check (auth.uid() = user_id);
create policy "user_can_select_own_app" on affiliate_applications for select to authenticated using (auth.uid() = user_id);
create policy "admin_can_do_all" on affiliate_applications for all using (is_claims_admin());

-- affiliates
alter table affiliates enable row level security;
create policy "user_can_select_update_own_affiliate_record" on affiliates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin_can_do_all" on affiliates for all using (is_claims_admin());

-- affiliate_clicks
alter table affiliate_clicks enable row level security;
create policy "affiliate_can_see_own_clicks" on affiliate_clicks for select using (affiliate_id = get_my_affiliate_id());
create policy "admin_can_do_all" on affiliate_clicks for all using (is_claims_admin());

-- affiliate_referrals
alter table affiliate_referrals enable row level security;
create policy "affiliate_can_see_own_referrals" on affiliate_referrals for select using (affiliate_id = get_my_affiliate_id());
create policy "admin_can_do_all" on affiliate_referrals for all using (is_claims_admin());

-- affiliate_free_referrals
alter table affiliate_free_referrals enable row level security;
create policy "affiliate_can_see_own_free_referrals" on affiliate_free_referrals for select using (affiliate_id = get_my_affiliate_id());
create policy "admin_can_do_all" on affiliate_free_referrals for all using (is_claims_admin());

-- affiliate_commissions
alter table affiliate_commissions enable row level security;
create policy "affiliate_can_see_own_commissions" on affiliate_commissions for select using (affiliate_id = get_my_affiliate_id());
create policy "admin_can_do_all" on affiliate_commissions for all using (is_claims_admin());

-- affiliate_payouts
alter table affiliate_payouts enable row level security;
create policy "affiliate_can_manage_own_payouts" on affiliate_payouts for all using (affiliate_id = get_my_affiliate_id()) with check (affiliate_id = get_my_affiliate_id());
create policy "admin_can_do_all" on affiliate_payouts for all using (is_claims_admin());
