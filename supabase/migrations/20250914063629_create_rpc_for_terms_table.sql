CREATE OR REPLACE FUNCTION create_terms_and_conditions_table_and_seed()
RETURNS void AS $$
BEGIN
    -- This function should be run by an admin.
    -- The is_admin() function is expected to exist and handle authorization.
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can perform this action';
    END IF;

    -- Create table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.terms_and_conditions (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create or replace the trigger function
    -- This function is generic and can be reused for other tables.
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER AS $function$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    -- Drop trigger if it exists on the target table, then create it
    DROP TRIGGER IF EXISTS terms_and_conditions_updated_at ON public.terms_and_conditions;
    CREATE TRIGGER terms_and_conditions_updated_at
    BEFORE UPDATE ON public.terms_and_conditions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

    -- Enable RLS on the table
    ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist to avoid errors on re-run, then create them
    DROP POLICY IF EXISTS "Allow public read access" ON public.terms_and_conditions;
    CREATE POLICY "Allow public read access" ON public.terms_and_conditions FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow admin write access" ON public.terms_and_conditions;
    CREATE POLICY "Allow admin write access" ON public.terms_and_conditions FOR ALL USING (public.is_admin(auth.uid()));

    -- Insert initial data only if the table is empty to prevent duplicates
    IF NOT EXISTS (SELECT 1 FROM public.terms_and_conditions) THEN
        INSERT INTO public.terms_and_conditions (content) VALUES ('# Terms and Conditions

Please replace this with your actual terms and conditions.');
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to the 'authenticated' role.
-- The function itself contains the admin check, so this is safe.
GRANT EXECUTE ON FUNCTION public.create_terms_and_conditions_table_and_seed() TO authenticated;
