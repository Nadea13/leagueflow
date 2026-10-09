-- Fix security policies & RLS vulnerabilities

-- 1. Fix users_insert policy vulnerability (Limit insert to authenticated user matching their auth.uid())
DROP POLICY IF EXISTS "users_insert" ON "public"."users";
CREATE POLICY "users_insert" ON "public"."users" FOR INSERT WITH CHECK ("auth"."uid"() = "id");

-- 2. Fix announcements_write policy bug (Self-comparison in tournament_invitations)
DROP POLICY IF EXISTS "announcements_write" ON "public"."announcements";
CREATE POLICY "announcements_write" ON "public"."announcements" TO "authenticated" USING (
    (EXISTS (
        SELECT 1 FROM "public"."tournaments"
        WHERE "tournaments"."id" = "announcements"."tournament_id" 
          AND "tournaments"."organizer_id" = "auth"."uid"()
    )) 
    OR 
    (EXISTS (
        SELECT 1 FROM "public"."tournament_invitations"
        WHERE "tournament_invitations"."tournament_id" = "announcements"."tournament_id"
          AND ("tournament_invitations"."email")::text = ((SELECT "users"."email" FROM "public"."users" WHERE "users"."id" = "auth"."uid"()))::text
          AND "tournament_invitations"."status" = 'accepted'::"public"."invitation_status_enum"
          AND "tournament_invitations"."role" = ANY (ARRAY['co_organizer'::"public"."invitation_role_enum", 'staff'::"public"."invitation_role_enum"])
    ))
);

-- 3. Fix tournament_sponsors_write policy bug (Self-comparison in tournament_invitations)
DROP POLICY IF EXISTS "tournament_sponsors_write" ON "public"."tournament_sponsors";
CREATE POLICY "tournament_sponsors_write" ON "public"."tournament_sponsors" TO "authenticated" USING (
    (EXISTS (
        SELECT 1 FROM "public"."tournaments"
        WHERE "tournaments"."id" = "tournament_sponsors"."tournament_id" 
          AND "tournaments"."organizer_id" = "auth"."uid"()
    )) 
    OR 
    (EXISTS (
        SELECT 1 FROM "public"."tournament_invitations"
        WHERE "tournament_invitations"."tournament_id" = "tournament_sponsors"."tournament_id"
          AND ("tournament_invitations"."email")::text = ((SELECT "users"."email" FROM "public"."users" WHERE "users"."id" = "auth"."uid"()))::text
          AND "tournament_invitations"."status" = 'accepted'::"public"."invitation_status_enum"
          AND "tournament_invitations"."role" = ANY (ARRAY['co_organizer'::"public"."invitation_role_enum", 'staff'::"public"."invitation_role_enum"])
    ))
);

-- 4. Tighten master_players_select policy so manager/organizers only see relevant players
DROP POLICY IF EXISTS "master_players_select" ON "public"."master_players";
CREATE POLICY "master_players_select" ON "public"."master_players" FOR SELECT TO "authenticated" USING (
    ("auth"."uid"() = "user_id") 
    OR 
    ((SELECT "users"."is_admin" FROM "public"."users" WHERE "users"."id" = "auth"."uid"()) = true)
    OR 
    (EXISTS (
        SELECT 1 FROM "public"."player_sports" ps
        JOIN "public"."teams" t ON t."id" = ps."team_id"
        WHERE ps."player_id" = "master_players"."id"
          AND t."user_id" = "auth"."uid"()
    ))
    OR 
    (EXISTS (
        SELECT 1 FROM "public"."player_sports" ps
        JOIN "public"."tournament_teams" tt ON tt."team_id" = ps."team_id"
        JOIN "public"."tournament_categories" tc ON tc."id" = tt."tournament_category_id"
        JOIN "public"."tournaments" tr ON tr."id" = tc."tournament_id"
        WHERE ps."player_id" = "master_players"."id"
          AND tr."organizer_id" = "auth"."uid"()
    ))
);
