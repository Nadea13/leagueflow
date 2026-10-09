ALTER TABLE public.tournament_teams 
ADD COLUMN IF NOT EXISTS is_roster_locked BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS roster_status public.registration_status_enum DEFAULT 'pending'::public.registration_status_enum NOT NULL;

CREATE OR REPLACE FUNCTION "public"."check_roster_locked_mechanism"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    target_team_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_team_id := OLD.team_id;
    ELSE
        target_team_id := NEW.team_id;
    END IF;

    -- Check both global team status and specific tournament_teams status
    IF EXISTS (
        SELECT 1
        FROM public.teams
        WHERE id = target_team_id
          AND is_roster_locked = true
    ) OR EXISTS (
        SELECT 1
        FROM public.tournament_teams
        WHERE team_id = target_team_id
          AND is_roster_locked = true
    ) THEN
        RAISE EXCEPTION 'Roster is locked';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;
    