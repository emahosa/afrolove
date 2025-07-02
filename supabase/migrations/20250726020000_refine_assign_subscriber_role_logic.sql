-- Refine the logic in assign_subscriber_role to more robustly handle subscription status changes.
-- This ensures that if a subscription is not 'active', the 'subscriber' role is removed,
-- and 'voter' role is added back if no other higher-privileged roles exist.

CREATE OR REPLACE FUNCTION public.assign_subscriber_role()
RETURNS TRIGGER AS $$
BEGIN
    -- When subscription becomes active (or is newly inserted as active)
    IF NEW.subscription_status = 'active' AND (OLD IS NULL OR OLD.subscription_status IS DISTINCT FROM 'active') THEN
        -- Remove voter role if exists (subscriber is a higher role)
        DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'voter';

        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.user_id, 'subscriber')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- When subscription is NOT 'active' (updated to non-active, or inserted as non-active)
    IF NEW.subscription_status IS DISTINCT FROM 'active' THEN
        -- Check if the user currently has the 'subscriber' role.
        -- We only want to remove 'subscriber' if it exists AND the subscription is not active.
        -- This also handles cases where a subscription might be updated from one non-active state to another,
        -- ensuring the subscriber role is removed if it was somehow present.
        IF EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.user_id AND ur.role = 'subscriber') THEN
            DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'subscriber';

            -- If subscriber role was removed (because subscription is not active),
            -- then decide if voter role needs to be re-added.
            -- Re-add 'voter' role only if no other significant roles (admin, affiliate) exist.
            IF NOT EXISTS (
                SELECT 1 FROM public.user_roles urOther
                WHERE urOther.user_id = NEW.user_id AND urOther.role IN ('admin', 'super_admin', 'affiliate')
            ) THEN
                INSERT INTO public.user_roles (user_id, role)
                VALUES (NEW.user_id, 'voter')
                ON CONFLICT (user_id, role) DO NOTHING;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger itself (on_subscription_change ON user_subscriptions) does not need to be redefined
-- as its definition (AFTER INSERT OR UPDATE) is still appropriate.
-- Applying this function will replace the old one.
