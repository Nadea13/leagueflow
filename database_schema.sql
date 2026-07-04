-- LeagueFlow Database Schema Dump (Clean & Organized)
-- Generated on: 13/6/2569 16:23:00


-- =========================================================================
-- 1. EXTENSIONS
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


-- =========================================================================
-- 2. CUSTOM ENUMS & TYPES
-- =========================================================================

CREATE TYPE "public"."category_gender_enum" AS ENUM (
    'male',
    'female',
    'mixed',
    'open'
);

ALTER TYPE "public"."category_gender_enum" OWNER TO "postgres";

CREATE TYPE "public"."gender_enum" AS ENUM (
    'male',
    'female',
    'other',
    'unspecified'
);

ALTER TYPE "public"."gender_enum" OWNER TO "postgres";

CREATE TYPE "public"."invitation_role_enum" AS ENUM (
    'co_organizer',
    'staff',
    'referee'
);

ALTER TYPE "public"."invitation_role_enum" OWNER TO "postgres";

CREATE TYPE "public"."invitation_status_enum" AS ENUM (
    'pending',
    'accepted',
    'rejected'
);

ALTER TYPE "public"."invitation_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."match_stage_enum" AS ENUM (
    'group',
    'knockout',
    'final'
);

ALTER TYPE "public"."match_stage_enum" OWNER TO "postgres";

CREATE TYPE "public"."match_status_enum" AS ENUM (
    'scheduled',
    'live',
    'finished',
    'canceled'
);

ALTER TYPE "public"."match_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."match_timer_status_enum" AS ENUM (
    'stopped',
    'playing',
    'paused'
);

ALTER TYPE "public"."match_timer_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."payment_status_enum" AS ENUM (
    'pending',
    'checking',
    'paid',
    'rejected'
);

ALTER TYPE "public"."payment_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."player_status_enum" AS ENUM (
    'active',
    'injury',
    'retire'
);

ALTER TYPE "public"."player_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."registration_status_enum" AS ENUM (
    'pending',
    'approved',
    'rejected'
);

ALTER TYPE "public"."registration_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."sport_type_enum" AS ENUM (
    'team',
    'single'
);

ALTER TYPE "public"."sport_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."tournament_status_enum" AS ENUM (
    'draft',
    'upcoming',
    'ongoing',
    'finished'
);

ALTER TYPE "public"."tournament_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'organizer',
    'team_manager',
    'player'
);

ALTER TYPE "public"."user_role" OWNER TO "postgres";


-- =========================================================================
-- 3. SEQUENCES
-- =========================================================================

CREATE SEQUENCE IF NOT EXISTS "public"."age_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."age_categories_id_seq" OWNER TO "postgres";


-- =========================================================================
-- 4. TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS "public"."age_categories" (
    "id" integer NOT NULL,
    "category_name" character varying(255) NOT NULL,
    "min_age" integer DEFAULT 0 NOT NULL,
    "max_age" integer DEFAULT 99 NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" "text" NOT NULL,
    "cover_img" "text",
    "is_pinned" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."master_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "first_name_th" character varying(255) DEFAULT NULL,
    "middle_name_th" character varying(255) DEFAULT NULL,
    "last_name_th" character varying(255) DEFAULT NULL,
    "first_name_en" character varying(255) DEFAULT NULL,
    "middle_name_en" character varying(255) DEFAULT NULL,
    "last_name_en" character varying(255) DEFAULT NULL,
    "gender" "public"."gender_enum" DEFAULT 'unspecified'::"public"."gender_enum" NOT NULL,
    "birthday" "date" NOT NULL,
    "tel" character varying(20) DEFAULT NULL::character varying,
    "profile_img" "text",
    "status" "public"."player_status_enum" DEFAULT 'active'::"public"."player_status_enum" NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."match_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "player_id" "uuid",
    "event_type" character varying(100) NOT NULL,
    "period" integer DEFAULT 1 NOT NULL,
    "minute" integer,
    "extra_info" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_category_id" "uuid" NOT NULL,
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "home_score" "jsonb" DEFAULT '{"total": 0}'::"jsonb" NOT NULL,
    "away_score" "jsonb" DEFAULT '{"total": 0}'::"jsonb" NOT NULL,
    "round" integer DEFAULT 1 NOT NULL,
    "stage" "public"."match_stage_enum" DEFAULT 'group'::"public"."match_stage_enum" NOT NULL,
    "status" "public"."match_status_enum" DEFAULT 'scheduled'::"public"."match_status_enum" NOT NULL,
    "is_manual" boolean DEFAULT true NOT NULL,
    "scheduled_at" timestamp with time zone,
    "match_index" integer DEFAULT 0 NOT NULL,
    "timer_status" "public"."match_timer_status_enum" DEFAULT 'stopped'::"public"."match_timer_status_enum" NOT NULL,
    "elapsed_before_pause" integer DEFAULT 0 NOT NULL,
    "current_minute" integer,
    "node_id" character varying(255) DEFAULT NULL::character varying,
    "winner_to_node_id" character varying(255) DEFAULT NULL::character varying,
    "placeholder_home" character varying(255) DEFAULT NULL::character varying,
    "placeholder_away" character varying(255) DEFAULT NULL::character varying,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tournament_id" "uuid",
    "team_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "plan_name" character varying(100),
    "payment_status" character varying(50) DEFAULT 'pending' NOT NULL,
    "payment_method" character varying(50),
    "transaction_id" character varying(255),
    "raw_gateway_response" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."player_sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "position" character varying(100) DEFAULT NULL::character varying,
    "shirt_number" character varying(3) DEFAULT NULL::character varying,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "master_id" "uuid" NOT NULL,
    "display_name" character varying(255) NOT NULL,
    "tel" character varying(20) DEFAULT NULL::character varying,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sport_name" character varying(100) NOT NULL,
    "sport_type" "public"."sport_type_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."team_management_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "contact_phone" "text" NOT NULL,
    "message" "text",
    "status" "public"."registration_status_enum" DEFAULT 'pending'::"public"."registration_status_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "sport_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "logo_img" "text",
    "contact_name" character varying(255) NOT NULL,
    "contact_phone" character varying(20) NOT NULL,
    "is_roster_locked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone,
    "contact_email" character varying
);

CREATE TABLE IF NOT EXISTS "public"."tournament_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "age_category_id" integer NOT NULL,
    "gender_type" "public"."category_gender_enum" DEFAULT 'open'::"public"."category_gender_enum" NOT NULL,
    "max_teams" integer DEFAULT 0 NOT NULL,
    "canvas_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone,
    "registration_fee" numeric(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "public"."tournament_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" character varying(255) NOT NULL,
    "role" "public"."invitation_role_enum" DEFAULT 'staff'::"public"."invitation_role_enum" NOT NULL,
    "status" "public"."invitation_status_enum" DEFAULT 'pending'::"public"."invitation_status_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."tournament_sponsors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "sponsor_name" character varying(255) NOT NULL,
    "logo_img" "text" NOT NULL,
    "link_url" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."tournament_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_category_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "payment_status" "public"."payment_status_enum" DEFAULT 'pending'::"public"."payment_status_enum" NOT NULL,
    "slip_img" "text",
    "registration_status" "public"."registration_status_enum" DEFAULT 'pending'::"public"."registration_status_enum" NOT NULL,
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone,
    "contact_name" "text",
    "contact_phone" "text"
);

CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "logo_img" "text",
    "cover_img" "text",
    "description" "text",
    "location_name" character varying(255) DEFAULT NULL::character varying,
    "google_map_url" "text",
    "status" "public"."tournament_status_enum" DEFAULT 'draft'::"public"."tournament_status_enum" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "document_deadline" "date",
    "bank_name" character varying(100) DEFAULT NULL::character varying,
    "bank_account_name" character varying(255) DEFAULT NULL::character varying,
    "bank_account_number" character varying(50) DEFAULT NULL::character varying,
    "is_registration_open" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone,
    "broadcast_settings" "jsonb"
);

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "full_name" character varying(255) NOT NULL,
    "profile_img" "text",
    "phone" character varying(20) DEFAULT NULL::character varying,
    "role" "public"."user_role" DEFAULT 'player'::"public"."user_role" NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "is_organizer" boolean DEFAULT false NOT NULL,
    "is_team_manager" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);


-- =========================================================================
-- 5. FOREIGN KEYS & CONSTRAINTS
-- =========================================================================

ALTER SEQUENCE "public"."age_categories_id_seq" OWNED BY "public"."age_categories"."id";

ALTER TABLE "public"."age_categories" OWNER TO "postgres";

ALTER TABLE ONLY "public"."announcements" REPLICA IDENTITY FULL;

ALTER TABLE "public"."announcements" OWNER TO "postgres";

ALTER TABLE "public"."master_players" OWNER TO "postgres";

ALTER TABLE ONLY "public"."match_events" REPLICA IDENTITY FULL;

ALTER TABLE "public"."match_events" OWNER TO "postgres";

ALTER TABLE ONLY "public"."matches" REPLICA IDENTITY FULL;

ALTER TABLE "public"."matches" OWNER TO "postgres";

ALTER TABLE "public"."payments" OWNER TO "postgres";

ALTER TABLE "public"."player_sports" OWNER TO "postgres";

ALTER TABLE "public"."players" OWNER TO "postgres";

ALTER TABLE "public"."sports" OWNER TO "postgres";

ALTER TABLE "public"."team_management_requests" OWNER TO "postgres";

ALTER TABLE "public"."teams" OWNER TO "postgres";

ALTER TABLE "public"."tournament_categories" OWNER TO "postgres";

ALTER TABLE "public"."tournament_invitations" OWNER TO "postgres";

ALTER TABLE "public"."tournament_sponsors" OWNER TO "postgres";

ALTER TABLE "public"."tournament_teams" OWNER TO "postgres";

ALTER TABLE "public"."tournaments" OWNER TO "postgres";

ALTER TABLE "public"."users" OWNER TO "postgres";

ALTER TABLE ONLY "public"."age_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."age_categories_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."age_categories"
    ADD CONSTRAINT "age_categories_category_name_key" UNIQUE ("category_name");

ALTER TABLE ONLY "public"."age_categories"
    ADD CONSTRAINT "age_categories_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."master_players"
    ADD CONSTRAINT "master_players_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."player_sports"
    ADD CONSTRAINT "player_sports_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."team_management_requests"
    ADD CONSTRAINT "team_management_requests_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tournament_categories"
    ADD CONSTRAINT "tournament_categories_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tournament_sponsors"
    ADD CONSTRAINT "tournament_sponsors_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tournament_teams"
    ADD CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tournament_teams"
    ADD CONSTRAINT "unique_category_team_registration" UNIQUE ("tournament_category_id", "team_id");

ALTER TABLE ONLY "public"."tournament_categories"
    ADD CONSTRAINT "unique_tournament_category" UNIQUE ("tournament_id", "age_category_id", "gender_type");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."master_players"
    ADD CONSTRAINT "master_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_tournament_category_id_fkey" FOREIGN KEY ("tournament_category_id") REFERENCES "public"."tournament_categories"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."player_sports"
    ADD CONSTRAINT "player_sports_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."player_sports"
    ADD CONSTRAINT "player_sports_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "public"."master_players"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."team_management_requests"
    ADD CONSTRAINT "team_management_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_management_requests"
    ADD CONSTRAINT "team_management_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."tournament_categories"
    ADD CONSTRAINT "tournament_categories_age_category_id_fkey" FOREIGN KEY ("age_category_id") REFERENCES "public"."age_categories"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."tournament_categories"
    ADD CONSTRAINT "tournament_categories_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tournament_invitations"
    ADD CONSTRAINT "tournament_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."tournament_sponsors"
    ADD CONSTRAINT "tournament_sponsors_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tournament_teams"
    ADD CONSTRAINT "tournament_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tournament_teams"
    ADD CONSTRAINT "tournament_teams_tournament_category_id_fkey" FOREIGN KEY ("tournament_category_id") REFERENCES "public"."tournament_categories"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT;


-- =========================================================================
-- 6. INDEXES
-- =========================================================================

CREATE INDEX "idx_team_mgmt_req_status" ON "public"."team_management_requests" USING "btree" ("status");


-- =========================================================================
-- 7. FUNCTIONS & PROCEDURES
-- =========================================================================

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

    IF EXISTS (
        SELECT 1
        FROM public.teams
        WHERE id = target_team_id
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

ALTER FUNCTION "public"."check_roster_locked_mechanism"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user_sync_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, phone, role, is_organizer, is_team_manager)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'ผู้ใช้งานรายใหม่'),
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
        'player',
        false,
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.users.phone);
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user_sync_auth"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."initialize_leagueflow_storage_blueprints"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- โครงสร้างโฟลเดอร์สำหรับตั้งค่าในระบบ Storage ของผู้ใช้งาน:
    -- bucket 'avatars'       [Public]  -> สำหรับ users.profile_img, master_players.profile_img
    -- bucket 'logos'         [Public]  -> สำหรับ teams.logo_img, tournaments.logo_img, tournament_sponsors.logo_img
    -- bucket 'announcements' [Public]  -> สำหรับ announcements.cover_img
    -- bucket 'slips'         [Private] -> สำหรับ tournament_teams.slip_img (ห้ามสาธารณะเด็ดขาด มิดชิดสูงสุด)
    RAISE NOTICE 'LeagueFlow Storage buckets configuration recognized.';
END;
$$;

ALTER FUNCTION "public"."initialize_leagueflow_storage_blueprints"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_tournament_manager"("tourney_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;

ALTER FUNCTION "public"."is_tournament_manager"("tourney_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."purge_soft_deleted_records"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    r RECORD;
    delete_interval INTERVAL;
BEGIN
    -- Loop through all tables in the public schema that have a column named 'deleted_at'
    FOR r IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name = 'deleted_at'
    LOOP
        -- Determine the retention interval based on the table name
        -- 30 days for users, profiles, tournaments, teams, and master_players.
        -- 14 days for any other table with a deleted_at column.
        IF r.table_name IN ('users', 'profiles', 'tournaments', 'teams', 'master_players') THEN
            delete_interval := INTERVAL '30 days';
        ELSE
            delete_interval := INTERVAL '14 days';
        END IF;

        -- Execute dynamic SQL to delete expired rows
        EXECUTE format(
            'DELETE FROM public.%I WHERE deleted_at < now() - %L',
            r.table_name,
            delete_interval
        );
    END LOOP;
END;
$$;

ALTER FUNCTION "public"."purge_soft_deleted_records"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


-- =========================================================================
-- 8. TRIGGERS
-- =========================================================================

CREATE OR REPLACE TRIGGER "roster_lock_enforcement_trigger" BEFORE INSERT OR DELETE OR UPDATE ON "public"."player_sports" FOR EACH ROW EXECUTE FUNCTION "public"."check_roster_locked_mechanism"();

CREATE OR REPLACE TRIGGER "set_timestamp_age_categories" BEFORE UPDATE ON "public"."age_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_announcements" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_master_players" BEFORE UPDATE ON "public"."master_players" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_payments" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_match_events" BEFORE UPDATE ON "public"."match_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_matches" BEFORE UPDATE ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_player_sports" BEFORE UPDATE ON "public"."player_sports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_players" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_sports" BEFORE UPDATE ON "public"."sports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_teams" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_tournament_categories" BEFORE UPDATE ON "public"."tournament_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_tournament_invitations" BEFORE UPDATE ON "public"."tournament_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_tournament_sponsors" BEFORE UPDATE ON "public"."tournament_sponsors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_tournament_teams" BEFORE UPDATE ON "public"."tournament_teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_tournaments" BEFORE UPDATE ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_timestamp_users" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


-- =========================================================================
-- 9. ROW LEVEL SECURITY (RLS) & POLICIES
-- =========================================================================

CREATE POLICY "Users can insert own requests" ON "public"."team_management_requests" FOR INSERT TO "authenticated" WITH CHECK (("requester_id" = "auth"."uid"()));

CREATE POLICY "Users can view own requests" ON "public"."team_management_requests" FOR SELECT TO "authenticated" USING (("requester_id" = "auth"."uid"()));

ALTER TABLE "public"."age_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "age_categories_all" ON "public"."age_categories" TO "authenticated" USING ((( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true));

CREATE POLICY "age_categories_select" ON "public"."age_categories" FOR SELECT USING (true);

ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select" ON "public"."announcements" FOR SELECT USING (true);

CREATE POLICY "announcements_write" ON "public"."announcements" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "announcements"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_invitations"
  WHERE (("tournament_invitations"."tournament_id" = "tournament_invitations"."tournament_id") AND (("tournament_invitations"."email")::"text" = (( SELECT "users"."email"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("tournament_invitations"."status" = 'accepted'::"public"."invitation_status_enum") AND ("tournament_invitations"."role" = ANY (ARRAY['co_organizer'::"public"."invitation_role_enum", 'staff'::"public"."invitation_role_enum"])))))));

ALTER TABLE "public"."master_players" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_players_select" ON "public"."master_players" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (( SELECT "users"."is_organizer"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true) OR (( SELECT "users"."is_team_manager"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true)));

CREATE POLICY "master_players_write" ON "public"."master_players" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (("user_id" IS NULL) AND ((( SELECT "users"."is_organizer"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true) OR (( SELECT "users"."is_team_manager"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true))) OR (( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true)));

ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true)));

CREATE POLICY "payments_write" ON "public"."payments" TO "authenticated" USING ((( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true));

ALTER TABLE "public"."match_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_events_select" ON "public"."match_events" FOR SELECT USING (true);

CREATE POLICY "match_events_write" ON "public"."match_events" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM (("public"."matches" "m"
     JOIN "public"."tournament_categories" "tc" ON (("m"."tournament_category_id" = "tc"."id")))
     JOIN "public"."tournaments" "t" ON (("tc"."tournament_id" = "t"."id")))
  WHERE (("m"."id" = "match_events"."match_id") AND ("t"."organizer_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM (("public"."matches" "m"
     JOIN "public"."tournament_categories" "tc" ON (("m"."tournament_category_id" = "tc"."id")))
     JOIN "public"."tournament_invitations" "ti" ON (("tc"."tournament_id" = "ti"."tournament_id")))
  WHERE (("m"."id" = "match_events"."match_id") AND (("ti"."email")::"text" = (( SELECT "users"."email"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("ti"."status" = 'accepted'::"public"."invitation_status_enum"))))));

ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON "public"."matches" FOR SELECT USING (true);

CREATE POLICY "matches_write" ON "public"."matches" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."tournament_categories" "tc"
     JOIN "public"."tournaments" "t" ON (("tc"."tournament_id" = "t"."id")))
  WHERE (("tc"."id" = "matches"."tournament_category_id") AND ("t"."organizer_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_categories" "tc"
     JOIN "public"."tournament_invitations" "ti" ON (("tc"."tournament_id" = "ti"."tournament_id")))
  WHERE (("tc"."id" = "matches"."tournament_category_id") AND (("ti"."email")::"text" = (( SELECT "users"."email"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("ti"."status" = 'accepted'::"public"."invitation_status_enum"))))));

ALTER TABLE "public"."player_sports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_sports_select" ON "public"."player_sports" FOR SELECT USING (true);

CREATE POLICY "player_sports_write" ON "public"."player_sports" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "player_sports"."team_id") AND ("teams"."user_id" = "auth"."uid"())))));

ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select" ON "public"."players" FOR SELECT USING (true);

CREATE POLICY "players_write" ON "public"."players" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."player_sports" "ps"
     JOIN "public"."teams" "t" ON (("ps"."team_id" = "t"."id")))
  WHERE (("ps"."player_id" = "players"."id") AND ("t"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ((("public"."player_sports" "ps"
     JOIN "public"."tournament_teams" "tt" ON (("ps"."team_id" = "tt"."team_id")))
     JOIN "public"."tournament_categories" "tc" ON (("tt"."tournament_category_id" = "tc"."id")))
     JOIN "public"."tournaments" "tr" ON (("tc"."tournament_id" = "tr"."id")))
  WHERE (("ps"."player_id" = "players"."id") AND ("tr"."organizer_id" = "auth"."uid"()))))));

ALTER TABLE "public"."sports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_all" ON "public"."sports" TO "authenticated" USING ((( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true));

CREATE POLICY "sports_select" ON "public"."sports" FOR SELECT USING (true);

ALTER TABLE "public"."team_management_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_delete" ON "public"."teams" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));

CREATE POLICY "teams_insert" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "users"."is_team_manager"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true) OR ("auth"."uid"() = "user_id")));

CREATE POLICY "teams_select" ON "public"."teams" FOR SELECT USING (true);

CREATE POLICY "teams_write" ON "public"."teams" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."tournament_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_categories_select" ON "public"."tournament_categories" FOR SELECT USING (true);

CREATE POLICY "tournament_categories_write" ON "public"."tournament_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "tournament_categories"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))));

ALTER TABLE "public"."tournament_invitations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_invitations_delete" ON "public"."tournament_invitations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "tournament_invitations"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))));

CREATE POLICY "tournament_invitations_manage" ON "public"."tournament_invitations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "tournament_invitations"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))));

CREATE POLICY "tournament_invitations_select" ON "public"."tournament_invitations" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "tournament_invitations"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))) OR (("email")::"text" = (( SELECT "users"."email"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text")));

CREATE POLICY "tournament_invitations_update" ON "public"."tournament_invitations" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "tournament_invitations"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))) OR (("email")::"text" = (( SELECT "users"."email"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text")));

ALTER TABLE "public"."tournament_sponsors" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_sponsors_select" ON "public"."tournament_sponsors" FOR SELECT USING (true);

CREATE POLICY "tournament_sponsors_write" ON "public"."tournament_sponsors" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "tournament_sponsors"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_invitations"
  WHERE (("tournament_invitations"."tournament_id" = "tournament_invitations"."tournament_id") AND (("tournament_invitations"."email")::"text" = (( SELECT "users"."email"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("tournament_invitations"."status" = 'accepted'::"public"."invitation_status_enum") AND ("tournament_invitations"."role" = ANY (ARRAY['co_organizer'::"public"."invitation_role_enum", 'staff'::"public"."invitation_role_enum"])))))));

ALTER TABLE "public"."tournament_teams" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_teams_delete" ON "public"."tournament_teams" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "tournament_teams"."team_id") AND ("teams"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_categories" "tc"
     JOIN "public"."tournaments" "t" ON (("tc"."tournament_id" = "t"."id")))
  WHERE (("tc"."id" = "tournament_teams"."tournament_category_id") AND ("t"."organizer_id" = "auth"."uid"()))))));

CREATE POLICY "tournament_teams_insert" ON "public"."tournament_teams" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "tournament_teams"."team_id") AND ("teams"."user_id" = "auth"."uid"())))));

CREATE POLICY "tournament_teams_select" ON "public"."tournament_teams" FOR SELECT USING (true);

CREATE POLICY "tournament_teams_update" ON "public"."tournament_teams" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "tournament_teams"."team_id") AND ("teams"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_categories" "tc"
     JOIN "public"."tournaments" "t" ON (("tc"."tournament_id" = "t"."id")))
  WHERE (("tc"."id" = "tournament_teams"."tournament_category_id") AND ("t"."organizer_id" = "auth"."uid"()))))));

ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_select" ON "public"."tournaments" FOR SELECT USING (true);

CREATE POLICY "tournaments_write" ON "public"."tournaments" TO "authenticated" USING ((("auth"."uid"() = "organizer_id") OR (( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true)));

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_delete" ON "public"."users" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "id") OR (( SELECT "users_1"."is_admin"
   FROM "public"."users" "users_1"
  WHERE ("users_1"."id" = "auth"."uid"())) = true)));

CREATE POLICY "users_insert" ON "public"."users" FOR INSERT WITH CHECK (true);

CREATE POLICY "users_select" ON "public"."users" FOR SELECT USING (true);

CREATE POLICY "users_update" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));


-- =========================================================================
-- 10. GRANTS & PERMISSIONS
-- =========================================================================

GRANT ALL ON SCHEMA "public" TO PUBLIC;

GRANT ALL ON SCHEMA "public" TO "anon";

GRANT ALL ON SCHEMA "public" TO "authenticated";

GRANT ALL ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."check_roster_locked_mechanism"() TO "anon";

GRANT ALL ON FUNCTION "public"."check_roster_locked_mechanism"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."check_roster_locked_mechanism"() TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user_sync_auth"() TO "anon";

GRANT ALL ON FUNCTION "public"."handle_new_user_sync_auth"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."handle_new_user_sync_auth"() TO "service_role";

GRANT ALL ON FUNCTION "public"."initialize_leagueflow_storage_blueprints"() TO "anon";

GRANT ALL ON FUNCTION "public"."initialize_leagueflow_storage_blueprints"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."initialize_leagueflow_storage_blueprints"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

GRANT ALL ON TABLE "public"."age_categories" TO "anon";

GRANT ALL ON TABLE "public"."age_categories" TO "authenticated";

GRANT ALL ON TABLE "public"."age_categories" TO "service_role";

GRANT ALL ON SEQUENCE "public"."age_categories_id_seq" TO "anon";

GRANT ALL ON SEQUENCE "public"."age_categories_id_seq" TO "authenticated";

GRANT ALL ON SEQUENCE "public"."age_categories_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."announcements" TO "anon";

GRANT ALL ON TABLE "public"."announcements" TO "authenticated";

GRANT ALL ON TABLE "public"."announcements" TO "service_role";

GRANT ALL ON TABLE "public"."master_players" TO "anon";

GRANT ALL ON TABLE "public"."master_players" TO "authenticated";

GRANT ALL ON TABLE "public"."master_players" TO "service_role";

GRANT ALL ON TABLE "public"."payments" TO "anon";

GRANT ALL ON TABLE "public"."payments" TO "authenticated";

GRANT ALL ON TABLE "public"."payments" TO "service_role";

GRANT ALL ON TABLE "public"."match_events" TO "anon";

GRANT ALL ON TABLE "public"."match_events" TO "authenticated";

GRANT ALL ON TABLE "public"."match_events" TO "service_role";

GRANT ALL ON TABLE "public"."matches" TO "anon";

GRANT ALL ON TABLE "public"."matches" TO "authenticated";

GRANT ALL ON TABLE "public"."matches" TO "service_role";

GRANT ALL ON TABLE "public"."player_sports" TO "anon";

GRANT ALL ON TABLE "public"."player_sports" TO "authenticated";

GRANT ALL ON TABLE "public"."player_sports" TO "service_role";

GRANT ALL ON TABLE "public"."players" TO "anon";

GRANT ALL ON TABLE "public"."players" TO "authenticated";

GRANT ALL ON TABLE "public"."players" TO "service_role";

GRANT ALL ON TABLE "public"."sports" TO "anon";

GRANT ALL ON TABLE "public"."sports" TO "authenticated";

GRANT ALL ON TABLE "public"."sports" TO "service_role";

GRANT ALL ON TABLE "public"."team_management_requests" TO "service_role";

GRANT SELECT,INSERT ON TABLE "public"."team_management_requests" TO "authenticated";

GRANT ALL ON TABLE "public"."teams" TO "anon";

GRANT ALL ON TABLE "public"."teams" TO "authenticated";

GRANT ALL ON TABLE "public"."teams" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_categories" TO "anon";

GRANT ALL ON TABLE "public"."tournament_categories" TO "authenticated";

GRANT ALL ON TABLE "public"."tournament_categories" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_invitations" TO "anon";

GRANT ALL ON TABLE "public"."tournament_invitations" TO "authenticated";

GRANT ALL ON TABLE "public"."tournament_invitations" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_sponsors" TO "anon";

GRANT ALL ON TABLE "public"."tournament_sponsors" TO "authenticated";

GRANT ALL ON TABLE "public"."tournament_sponsors" TO "service_role";

GRANT ALL ON TABLE "public"."tournament_teams" TO "anon";

GRANT ALL ON TABLE "public"."tournament_teams" TO "authenticated";

GRANT ALL ON TABLE "public"."tournament_teams" TO "service_role";

GRANT ALL ON TABLE "public"."tournaments" TO "anon";

GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";

GRANT ALL ON TABLE "public"."tournaments" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";

GRANT ALL ON TABLE "public"."users" TO "authenticated";

GRANT ALL ON TABLE "public"."users" TO "service_role";


-- =========================================================================
-- 11. MISCELLANEOUS / OTHERS
-- =========================================================================

ALTER SCHEMA "public" OWNER TO "postgres";

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."announcements";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_events";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."matches";

REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;


