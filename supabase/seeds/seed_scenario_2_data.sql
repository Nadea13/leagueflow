-- Scenario 2: Tournament Configuration & Global Setup
-- Target: 'Test Scenario Tournament'

DO $$
DECLARE
    tid UUID;
    admin_id UUID;
    editor_email TEXT := 'editor@test.com';
    editor_id UUID := 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0';
BEGIN
    -- 1. Get Tournament and Admin
    SELECT id INTO tid FROM public.tournaments WHERE name = 'Test Scenario Tournament' LIMIT 1;
    SELECT user_id INTO admin_id FROM public.tournaments WHERE id = tid;

    IF tid IS NULL THEN
        RAISE NOTICE 'Tournament not found. Please run Scenario 1 seeding first.';
        RETURN;
    END IF;

    -- 2. Seed Tournament Rules
    INSERT INTO public.tournament_rules (
        tournament_id, half_duration, extra_time_duration, 
        yellow_card_ban_threshold, points_for_win, points_for_draw
    )
    VALUES (tid, 25, 10, 2, 3, 1)
    ON CONFLICT (tournament_id) DO UPDATE SET
        half_duration = EXCLUDED.half_duration,
        yellow_card_ban_threshold = EXCLUDED.yellow_card_ban_threshold;

    -- 3. Seed Venues
    INSERT INTO public.venues (tournament_id, name, address, google_maps_url, notes)
    VALUES 
        (tid, 'Pitch A (Main)', 'Bangkok, Thailand', 'https://maps.google.com/?q=PitchA', 'Artificial grass'),
        (tid, 'Pitch B (Secondary)', 'Bangkok, Thailand', 'https://maps.google.com/?q=PitchB', 'Natural grass')
    ON CONFLICT DO NOTHING;

    -- 4. Seed StaffInvitation (tournament_members)
    -- First ensure the editor user exists in auth (for login tests)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = editor_email) THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, instance_id)
        VALUES (
            editor_id,
            editor_email,
            crypt('password', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            NOW(),
            NOW(),
            'authenticated',
            '00000000-0000-0000-0000-000000000000'
        );
        -- Trigger handles profile
        UPDATE public.profiles SET full_name = 'Editor Staff' WHERE id = editor_id;
    END IF;

    INSERT INTO public.tournament_members (tournament_id, email, role, status)
    VALUES (tid, editor_email, 'editor', 'pending')
    ON CONFLICT (tournament_id, email) DO NOTHING;

    -- 5. Seed Announcements
    INSERT INTO public.announcements (tournament_id, title, content, is_pinned)
    VALUES (tid, 'Welcome to Test Scenario!', 'Please ensure all teams arrive 30 mins before kickoff.', true)
    ON CONFLICT DO NOTHING;

END $$;
