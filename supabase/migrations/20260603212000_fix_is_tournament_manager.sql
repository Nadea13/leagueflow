CREATE OR REPLACE FUNCTION public.is_tournament_manager(tourney_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tournaments WHERE id = tourney_id AND organizer_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.tournament_invitations 
        WHERE tournament_id = tourney_id 
        AND user_id = auth.uid() 
        AND role IN ('co_organizer', 'staff')
        AND status = 'accepted'
        AND deleted_at IS NULL
    );
END;
$function$;
