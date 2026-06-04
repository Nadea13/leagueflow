-- Drop old triggers and functions
DROP TRIGGER IF EXISTS on_match_event_change_trigger ON public.match_events;
DROP FUNCTION IF EXISTS public.on_match_event_change();
DROP FUNCTION IF EXISTS public.recalculate_player_match_stats(uuid, uuid);
DROP TABLE IF EXISTS public.player_statistics;

