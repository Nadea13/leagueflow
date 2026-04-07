-- Seed 110+ Users for Pagination Tests
DO $$
DECLARE
    i INT;
    temp_user_id UUID;
    temp_email TEXT;
BEGIN
    FOR i IN 1..110 LOOP
        temp_user_id := gen_random_uuid();
        temp_email := 'user' || i || '@example.com';
        
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = temp_email) THEN
            -- Insert into auth.users (Supabase internal)
            -- Note: In a real environment, we'd use the admin API, but for local dev with service role, direct SQL works.
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, instance_id)
            VALUES (
                temp_user_id,
                temp_email,
                crypt('password', gen_salt('bf')),
                NOW(),
                '{"provider":"email","providers":["email"]}',
                '{}',
                NOW(),
                NOW(),
                'authenticated',
                '00000000-0000-0000-0000-000000000000'
            );

            -- Profile is automatically created by trigger on_auth_user_created.
            -- We just update the details.
            UPDATE public.profiles 
            SET full_name = 'Test User ' || i, role = 'user'
            WHERE id = temp_user_id;
        END IF;
    END LOOP;

    -- Specific user for TC003
    temp_email := 'admin@example.com';
    temp_user_id := gen_random_uuid();
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = temp_email) THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, instance_id)
        VALUES (
            temp_user_id,
            temp_email,
            crypt('password', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            NOW(),
            NOW(),
            'authenticated',
            '00000000-0000-0000-0000-000000000000'
        );
        UPDATE public.profiles 
        SET full_name = 'Admin Search Test', role = 'admin'
        WHERE id = temp_user_id;
    END IF;
END $$;

-- Create a Test Tournament for Match Generation (TC025)
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Try to find the admin user first
    SELECT id INTO admin_id FROM public.profiles WHERE email = 'admin@test.com' LIMIT 1;
    
    -- If admin doesn't exist (unlikely in this context), use any user
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM public.profiles LIMIT 1;
    END IF;

    -- Create tournament if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.tournaments WHERE name = 'Test Scenario Tournament') THEN
        INSERT INTO public.tournaments (name, format, status, max_teams, user_id, created_at)
        VALUES ('Test Scenario Tournament', 'league', 'active', 16, admin_id, NOW());
    END IF;
END $$;

DO $$
DECLARE
    tid UUID;
    team1_id UUID;
    team2_id UUID;
BEGIN
    SELECT id INTO tid FROM public.tournaments WHERE name = 'Test Scenario Tournament' LIMIT 1;
    
    -- Add 2 Teams
    INSERT INTO public.teams (tournament_id, name, created_at)
    VALUES (tid, 'Team Alpha', NOW()) RETURNING id INTO team1_id;
    
    INSERT INTO public.teams (tournament_id, name, created_at)
    VALUES (tid, 'Team Beta', NOW()) RETURNING id INTO team2_id;
    
    -- Add Players to teams
    INSERT INTO public.players (team_id, name, created_at)
    VALUES (team1_id, 'Player A1', NOW()), (team2_id, 'Player B1', NOW());
END $$;

-- Seed Payment Records for Finance Filter (TC007)
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM public.profiles WHERE email = 'admin@test.com' LIMIT 1;
    
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM public.profiles LIMIT 1;
    END IF;

    -- Note: 'currency' and 'updated_at' are not in schema. 'user_id', 'payment_method', 'plan' are required.
    INSERT INTO public.payments (user_id, status, amount, payment_method, plan, created_at)
    VALUES 
        (admin_id, 'pending', 500, 'promptpay', 'monthly_pro', NOW()),
        (admin_id, 'pending', 1200, 'bank_transfer', 'monthly_pro', NOW()),
        (admin_id, 'success', 2500, 'promptpay', 'tournament_pro', NOW());
END $$;

-- Seed Bug Reports for Reports Workflow (TC009)
INSERT INTO public.bug_reports (message, status, created_at)
VALUES 
    ('Test bug report 1', 'unread', NOW()),
    ('Test bug report 2', 'unread', NOW()),
    ('Test bug report 3', 'read', NOW());
