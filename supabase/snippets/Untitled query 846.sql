CREATE POLICY teams_select ON teams FOR SELECT USING (true);
CREATE POLICY teams_insert ON teams FOR INSERT TO authenticated WITH CHECK (
    (SELECT is_team_manager FROM users WHERE id = auth.uid()) = true OR auth.uid() = user_id
);
CREATE POLICY teams_write ON teams FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY teams_delete ON teams FOR DELETE TO authenticated USING (auth.uid() = user_id);