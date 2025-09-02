-- Function to handle the review of a producer application
CREATE OR REPLACE FUNCTION public.handle_review_producer_application(
    p_application_id uuid,
    p_new_status public.producer_application_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- To run with the permissions of the function owner
AS $$
DECLARE
    v_user_id uuid;
    v_current_status public.producer_application_status;
BEGIN
    -- Ensure the caller is an admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can review applications';
    END IF;

    -- Get the application details
    SELECT user_id, status INTO v_user_id, v_current_status
    FROM public.producer_applications
    WHERE id = p_application_id;

    -- Check if application exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    -- Check if application is already processed
    IF v_current_status <> 'pending' THEN
        RAISE EXCEPTION 'Application has already been processed';
    END IF;

    -- Update the application status
    UPDATE public.producer_applications
    SET status = p_new_status
    WHERE id = p_application_id;

    -- If approved, grant the producer role and create default settings
    IF p_new_status = 'approved' THEN
        -- Grant the 'producer' role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'producer')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- Create default producer settings
        INSERT INTO public.producer_settings (user_id)
        VALUES (v_user_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END;
$$;
