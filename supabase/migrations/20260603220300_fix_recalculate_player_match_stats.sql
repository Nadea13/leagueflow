CREATE OR REPLACE FUNCTION public.recalculate_player_match_stats(p_master_player_id uuid, p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_tournament_id uuid;
    v_goals int := 0;
    v_assists int := 0;
    v_yellow_cards int := 0;
    v_red_cards int := 0;
    v_fouls int := 0;
    v_saves int := 0;
    v_injuries int := 0;
    v_corners int := 0;
    v_penalties int := 0;
    v_subs_in int := 0;
    v_subs_out int := 0;
    v_stats jsonb;
BEGIN
    -- Get tournament_id from match via tournament_categories
    v_tournament_id := (
        SELECT tc.tournament_id
        FROM public.matches m
        JOIN public.tournament_categories tc ON m.tournament_category_id = tc.id
        WHERE m.id = p_match_id
    );

    IF v_tournament_id IS NULL THEN
        RETURN;
    END IF;

    -- Count goals scored
    v_goals := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON me.player_id = p.id
        WHERE me.match_id = p_match_id AND p.master_id = p_master_player_id AND me.event_type = 'goal'
    );

    -- Count assists (safely check for UUID pattern)
    v_assists := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON (
            CASE 
                WHEN me.extra_info->>'assist_player_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' 
                THEN (me.extra_info->>'assist_player_id')::uuid 
                ELSE NULL 
            END
        ) = p.id
        WHERE me.match_id = p_match_id AND me.event_type = 'goal' AND p.master_id = p_master_player_id
    );

    -- Count yellow cards
    v_yellow_cards := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON me.player_id = p.id
        WHERE me.match_id = p_match_id AND p.master_id = p_master_player_id AND me.event_type = 'yellow_card'
    );

    -- Count red cards
    v_red_cards := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON me.player_id = p.id
        WHERE me.match_id = p_match_id AND p.master_id = p_master_player_id AND (me.event_type = 'red_card' OR (me.event_type = 'yellow_card' AND me.extra_info->>'is_second_yellow' = 'true'))
    );

    -- Count fouls
    v_fouls := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON me.player_id = p.id
        WHERE me.match_id = p_match_id AND p.master_id = p_master_player_id AND me.event_type = 'foul'
    );

    -- Count saves
    v_saves := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON me.player_id = p.id
        WHERE me.match_id = p_match_id AND p.master_id = p_master_player_id AND me.event_type = 'save'
    );

    -- Count injuries
    v_injuries := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON me.player_id = p.id
        WHERE me.match_id = p_match_id AND p.master_id = p_master_player_id AND me.event_type = 'injury'
    );

    -- Count corners
    v_corners := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON me.player_id = p.id
        WHERE me.match_id = p_match_id AND p.master_id = p_master_player_id AND me.event_type = 'corner'
    );

    -- Count penalties
    v_penalties := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON me.player_id = p.id
        WHERE me.match_id = p_match_id AND p.master_id = p_master_player_id AND me.event_type = 'penalty'
    );

    -- Count substitutions In (safely check for UUID pattern)
    v_subs_in := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON (
            CASE 
                WHEN me.extra_info->>'in_player_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' 
                THEN (me.extra_info->>'in_player_id')::uuid 
                ELSE NULL 
            END
        ) = p.id
        WHERE me.match_id = p_match_id AND me.event_type = 'substitution' AND p.master_id = p_master_player_id
    );

    -- Count substitutions Out (safely check for UUID pattern)
    v_subs_out := (
        SELECT count(*)::int
        FROM public.match_events me
        JOIN public.players p ON (
            CASE 
                WHEN me.extra_info->>'out_player_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' 
                THEN (me.extra_info->>'out_player_id')::uuid 
                ELSE NULL 
            END
        ) = p.id
        WHERE me.match_id = p_match_id AND me.event_type = 'substitution' AND p.master_id = p_master_player_id
    );

    -- If all stats are 0, delete the record
    IF v_goals = 0 AND v_assists = 0 AND v_yellow_cards = 0 AND v_red_cards = 0 AND v_fouls = 0 AND v_saves = 0 AND v_injuries = 0 AND v_corners = 0 AND v_penalties = 0 AND v_subs_in = 0 AND v_subs_out = 0 THEN
        DELETE FROM public.player_statistics WHERE master_player_id = p_master_player_id AND match_id = p_match_id;
    ELSE
        v_stats := jsonb_build_object(
            'goals', v_goals,
            'assists', v_assists,
            'yellow_cards', v_yellow_cards,
            'red_cards', v_red_cards,
            'fouls', v_fouls,
            'saves', v_saves,
            'injuries', v_injuries,
            'corners', v_corners,
            'penalties', v_penalties,
            'subs_in', v_subs_in,
            'subs_out', v_subs_out
        );

        INSERT INTO public.player_statistics (master_player_id, tournament_id, match_id, stats)
        VALUES (p_master_player_id, v_tournament_id, p_match_id, v_stats)
        ON CONFLICT (master_player_id, match_id)
        DO UPDATE SET stats = EXCLUDED.stats, updated_at = now();
    END IF;
END;
$function$;
