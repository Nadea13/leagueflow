-- Fix foreign key constraint on penalty_shootouts
-- It previously referenced public.teams, but in a tournament match, 
-- home_team_id and away_team_id reference public.tournament_teams.
ALTER TABLE "public"."penalty_shootouts" DROP CONSTRAINT "penalty_shootouts_team_id_fkey";
ALTER TABLE "public"."penalty_shootouts" ADD CONSTRAINT "penalty_shootouts_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE;
