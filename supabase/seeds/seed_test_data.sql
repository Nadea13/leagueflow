-- seed_test_data.sql
-- Use this to populate your development database with data for testing.
-- WARNING: Only run this in Development or Staging environments.

-- 1. Create a few helper functions if needed (optional)
-- This script assumes profiles can be created. If auth.users is strictly enforced, 
-- you may need to create users via the Supabase Dashboard first.

DO $$
DECLARE
    admin_id UUID := '00000000-0000-0000-0000-000000000001'; -- Placeholder
    user_id_prefix TEXT := 'f0f0f0f0-0000-4000-8000-';
    current_uuid UUID;
    i INTEGER;
BEGIN
    -- Ensure we have at least one admin profile
    -- NOTE: This might fail if the ID is not in auth.users. 
    -- If so, please manually assign 'admin' role to one of your existing users.
    -- Ensure pgcrypto is available for password hashing
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    FOR i IN 1..50 LOOP
        current_uuid := (user_id_prefix || LPAD(i::text, 12, '0'))::UUID;
        
        -- We include common Supabase fields to ensure the record is valid.
        INSERT INTO auth.users (id, email, aud, role, email_confirmed_at, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
        VALUES (
            current_uuid,
            'testuser' || i || '@example.com',
            'authenticated',
            'authenticated',
            now(),
            crypt('password', gen_salt('bf')),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', 'Test User ' || i),
            now(),
            now(),
            '',
            '',
            '',
            ''
        ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

        -- We use ON CONFLICT to avoid errors on re-run
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            current_uuid,
            'testuser' || i || '@example.com',
            'Test User ' || i,
            CASE WHEN i = 1 THEN 'admin' ELSE 'user' END
        ) ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name, 
            role = EXCLUDED.role,
            updated_at = now();
    END LOOP;

    -- 3. Seed Tournaments
    FOR i IN 1..20 LOOP
        INSERT INTO public.tournaments (name, user_id, format, status, plan)
        VALUES (
            'Tournament ' || i,
            (user_id_prefix || LPAD(((i % 5) + 1)::text, 12, '0'))::UUID,
            CASE WHEN i % 2 = 0 THEN 'league' ELSE 'knockout' END,
            CASE WHEN i % 3 = 0 THEN 'active' WHEN i % 3 = 1 THEN 'draft' ELSE 'completed' END,
            CASE WHEN i % 4 = 0 THEN 'monthly' WHEN i % 4 = 1 THEN 'tournament' ELSE 'free' END
        );
    END LOOP;

    -- 4. Seed Payments (120 records for pagination testing)
    FOR i IN 1..120 LOOP
        INSERT INTO public.payments (user_id, amount, status, payment_method, plan, created_at)
        VALUES (
            (user_id_prefix || LPAD(((i % 10) + 1)::text, 12, '0'))::UUID,
            (590 + (i * 10)),
            CASE WHEN i % 5 = 0 THEN 'pending' WHEN i % 5 = 1 THEN 'failed' ELSE 'success' END,
            CASE WHEN i % 2 = 0 THEN 'promptpay' ELSE 'bank_transfer' END,
            'monthly_pro',
            NOW() - (i || ' hours')::interval
        );
    END LOOP;

    -- 5. Seed Bug Reports (60 records)
    FOR i IN 1..60 LOOP
        INSERT INTO public.bug_reports (user_id, user_email, message, status, created_at)
        VALUES (
            (user_id_prefix || LPAD(((i % 10) + 1)::text, 12, '0'))::UUID,
            'reporter' || i || '@example.com',
            'This is a sample bug report #' || i || '. Testing pagination and UI layout.',
            CASE WHEN i % 3 = 0 THEN 'unread' WHEN i % 3 = 1 THEN 'read' ELSE 'resolved' END,
            NOW() - (i || ' days')::interval
        );
    END LOOP;

    -- 6. Seed Venues & Rules for each Tournament
    FOR i IN 1..20 LOOP
        current_uuid := (SELECT id FROM public.tournaments WHERE name = 'Tournament ' || i LIMIT 1);
        
        -- Add 2 Venues per tournament
        INSERT INTO public.venues (tournament_id, name, address)
        VALUES 
            (current_uuid, 'Pitch A - ' || i, 'Main Stadium Sector 1'),
            (current_uuid, 'Pitch B - ' || i, 'Main Stadium Sector 2');
            
        -- Add Rules
        INSERT INTO public.tournament_rules (tournament_id, half_duration, points_for_win)
        VALUES (current_uuid, 20, 3) ON CONFLICT (tournament_id) DO NOTHING;

        -- Add Announcements
        INSERT INTO public.announcements (tournament_id, title, content, is_pinned)
        VALUES (current_uuid, 'Welcome to Tournament ' || i, 'Please check your match schedule.', TRUE);
    END LOOP;

END $$;

-- 7. Seed Audit Logs (150 records)
DO $$
DECLARE
    user_id_prefix TEXT := 'f0f0f0f0-0000-4000-8000-';
    i INTEGER;
BEGIN
    FOR i IN 1..150 LOOP
        INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details, created_at)
        VALUES (
            (user_id_prefix || LPAD(((i % 5) + 1)::text, 12, '0'))::UUID,
            CASE WHEN i % 2 = 0 THEN 'update_profile' ELSE 'create_tournament' END,
            'system',
            'target_' || i,
            jsonb_build_object('test', true, 'index', i),
            NOW() - (i || ' minutes')::interval
        );
    END LOOP;
END $$;
