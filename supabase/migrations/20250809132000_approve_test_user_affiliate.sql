-- This script ensures the test user is an approved affiliate
-- so that the Playwright verification script can access the dashboard.

DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- 1. Find the user ID for the test user
    SELECT id INTO test_user_id FROM public.profiles WHERE email = 'loxserviceng@gmail.com' LIMIT 1;

    -- 2. Check if the user exists
    IF test_user_id IS NOT NULL THEN
        -- 3. Check if an application already exists for this user
        IF EXISTS (SELECT 1 FROM public.affiliate_applications WHERE user_id = test_user_id) THEN
            -- If it exists, update its status to 'approved'
            UPDATE public.affiliate_applications
            SET status = 'approved',
                unique_referral_code = 'TESTREF123' -- Ensure a referral code exists
            WHERE user_id = test_user_id;
            RAISE NOTICE 'Updated existing affiliate application for loxserviceng@gmail.com to approved.';
        ELSE
            -- If it does not exist, insert a new, approved application
            INSERT INTO public.affiliate_applications (user_id, full_name, email, phone, social_media_url, reason_to_join, status, unique_referral_code)
            VALUES (
                test_user_id,
                'Test User',
                'loxserviceng@gmail.com',
                'N/A',
                'N/A',
                'Automated entry for verification testing.',
                'approved',
                'TESTREF123'
            );
            RAISE NOTICE 'Created a new, approved affiliate application for loxserviceng@gmail.com.';
        END IF;
    ELSE
        RAISE WARNING 'Test user loxserviceng@gmail.com not found in profiles table. Cannot make affiliate.';
    END IF;
END $$;
