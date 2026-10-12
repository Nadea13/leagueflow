CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- LeagueFlow Database Schema Dump (Clean & Organized)
-- Generated on: 13/6/2569 16:23:00


-- =========================================================================
-- 1. EXTENSIONS
-- =========================================================================


















-- =========================================================================
-- 2. CUSTOM ENUMS & TYPES
-- =========================================================================

CREATE TYPE "public"."category_gender_enum" AS ENUM (
    'male',
    'female',
    'mixed',
    'open'
);


CREATE TYPE "public"."gender_enum" AS ENUM (
    'male',
    'female',
    'other',
    'unspecified'
);


CREATE TYPE "public"."invitation_role_enum" AS ENUM (
    'co_organizer',
    'staff',
    'referee'
);


CREATE TYPE "public"."invitation_status_enum" AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


CREATE TYPE "public"."match_stage_enum" AS ENUM (
    'group',
    'knockout',
    'final'
);


CREATE TYPE "public"."match_status_enum" AS ENUM (
    'scheduled',
    'live',
    'finished',
    'canceled'
);


CREATE TYPE "public"."match_timer_status_enum" AS ENUM (
    'stopped',
    'playing',
    'paused'
);


CREATE TYPE "public"."payment_status_enum" AS ENUM (
    'pending',
    'checking',
    'paid',
    'rejected'
);


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'success',
    'failed'
);


CREATE TYPE "public"."player_status_enum" AS ENUM (
    'active',
    'injury',
    'retire'
);


CREATE TYPE "public"."registration_status_enum" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


CREATE TYPE "public"."sport_type_enum" AS ENUM (
    'team',
    'single'
);


CREATE TYPE "public"."tournament_status_enum" AS ENUM (
    'draft',
    'upcoming',
    'ongoing',
    'finished'
);


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'organizer',
    'team_manager',
    'player'
);



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
    "type" character varying(50) NOT NULL,
    "minute" integer DEFAULT 0 NOT NULL,
    "detail" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "stage" character varying(50) DEFAULT 'group'::character varying NOT NULL,
    "round" integer DEFAULT 1 NOT NULL,
    "idx_match" integer DEFAULT 0 NOT NULL,
    "node_id" character varying(255) DEFAULT NULL::character varying,
    "next_node_id" character varying(255) DEFAULT NULL::character varying,
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "ph_home" character varying(255) DEFAULT NULL::character varying,
    "ph_away" character varying(255) DEFAULT NULL::character varying,
    "home_score" integer DEFAULT 0 NOT NULL,
    "away_score" integer DEFAULT 0 NOT NULL,
    "score_detail" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "public"."match_status_enum" DEFAULT 'scheduled'::"public"."match_status_enum" NOT NULL,
    "timer_status" character varying(50) DEFAULT 'stopped'::character varying NOT NULL,
    "elapsed_seconds" integer DEFAULT 0 NOT NULL,
    "minute" integer,
    "scheduled_at" timestamp with time zone,
    "field_name" character varying(100),
    "is_manual" boolean DEFAULT true NOT NULL,
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
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
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
    "registration_fee" numeric(10,2) DEFAULT 0,
    "rules_config" "jsonb" DEFAULT '{}'::"jsonb"
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
    "cover_url" "text",
    "link_url" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."tournament_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "tournament_category_id" "uuid",
    "team_id" "uuid" NOT NULL,
    "seed_number" integer,
    "group_name" character varying(50),
    "payment_status" "public"."payment_status_enum" DEFAULT 'pending'::"public"."payment_status_enum" NOT NULL,
    "slip_img" "text",
    "registration_status" "public"."registration_status_enum" DEFAULT 'pending'::"public"."registration_status_enum" NOT NULL,
    "roster_status" "public"."registration_status_enum" DEFAULT 'pending'::"public"."registration_status_enum" NOT NULL,
    "is_roster_locked" boolean DEFAULT false NOT NULL,
    "unlock_requested" boolean DEFAULT false NOT NULL,
    "contact_name" character varying(255),
    "contact_phone" character varying(50),
    "contact_email" "text",
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."tournament_roster_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "shirt_number" character varying(10),
    "position" character varying(100),
    "tel" character varying(20),
    "photo_url" "text",
    "status" "public"."registration_status_enum" DEFAULT 'pending'::"public"."registration_status_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."tournament_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_team_id" "uuid" NOT NULL,
    "master_player_id" "uuid" NOT NULL,
    "shirt_number" character varying(10),
    "position" character varying(100),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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


ALTER TABLE ONLY "public"."announcements" REPLICA IDENTITY FULL;



ALTER TABLE ONLY "public"."match_events" REPLICA IDENTITY FULL;


ALTER TABLE ONLY "public"."matches" REPLICA IDENTITY FULL;














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
    ADD CONSTRAINT "team_management_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

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

ALTER TABLE ONLY "public"."tournament_roster_submissions"
    ADD CONSTRAINT "tournament_roster_submissions_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tournament_players"
    ADD CONSTRAINT "tournament_players_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tournament_players"
    ADD CONSTRAINT "tournament_players_master_player_id_fkey" FOREIGN KEY ("master_player_id") REFERENCES "public"."master_players"("id") ON DELETE CASCADE;

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

    -- Check both global team status and specific tournament_teams status
    IF EXISTS (
        SELECT 1
        FROM public.teams
        WHERE id = target_team_id
          AND is_roster_locked = true
    ) OR EXISTS (
        SELECT 1
        FROM public.tournament_teams
        WHERE team_id = target_team_id
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


CREATE OR REPLACE FUNCTION "public"."handle_new_user_sync_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, phone, role, is_organizer, is_team_manager)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸£à¸²à¸¢à¹ƒà¸«à¸¡à¹ˆ'),
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


CREATE OR REPLACE FUNCTION "public"."initialize_leagueflow_storage_blueprints"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- à¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¹‚à¸Ÿà¸¥à¹€à¸”à¸­à¸£à¹Œà¸ªà¸³à¸«à¸£à¸±à¸šà¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¹ƒà¸™à¸£à¸°à¸šà¸š Storage à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™:
    -- bucket 'avatars'       [Public]  -> à¸ªà¸³à¸«à¸£à¸±à¸š users.profile_img, master_players.profile_img
    -- bucket 'logos'         [Public]  -> à¸ªà¸³à¸«à¸£à¸±à¸š teams.logo_img, tournaments.logo_img, tournament_sponsors.logo_img
    -- bucket 'announcements' [Public]  -> à¸ªà¸³à¸«à¸£à¸±à¸š announcements.cover_img
    -- bucket 'slips'         [Private] -> à¸ªà¸³à¸«à¸£à¸±à¸š tournament_teams.slip_img (à¸«à¹‰à¸²à¸¡à¸ªà¸²à¸˜à¸²à¸£à¸“à¸°à¹€à¸”à¹‡à¸”à¸‚à¸²à¸” à¸¡à¸´à¸”à¸Šà¸´à¸”à¸ªà¸¹à¸‡à¸ªà¸¸à¸”)
    RAISE NOTICE 'LeagueFlow Storage buckets configuration recognized.';
END;
$$;


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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;



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




CREATE POLICY "age_categories_all" ON "public"."age_categories" TO "authenticated" USING ((( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true));



CREATE POLICY "announcements_write" ON "public"."announcements" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "announcements"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_invitations"
  WHERE (("tournament_invitations"."tournament_id" = "tournament_invitations"."tournament_id") AND (("tournament_invitations"."email")::"text" = (( SELECT "users"."email"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("tournament_invitations"."status" = 'accepted'::"public"."invitation_status_enum") AND ("tournament_invitations"."role" = ANY (ARRAY['co_organizer'::"public"."invitation_role_enum", 'staff'::"public"."invitation_role_enum"])))))));


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


CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (( SELECT ("users"."role" = 'admin'::public.user_role)
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true)));

CREATE POLICY "payments_write" ON "public"."payments" TO "authenticated" USING ((( SELECT ("users"."role" = 'admin'::public.user_role)
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true));


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


CREATE POLICY "matches_write" ON "public"."matches" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."tournament_categories" "tc"
     JOIN "public"."tournaments" "t" ON (("tc"."tournament_id" = "t"."id")))
  WHERE (("tc"."id" = "matches"."tournament_category_id") AND ("t"."organizer_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_categories" "tc"
     JOIN "public"."tournament_invitations" "ti" ON (("tc"."tournament_id" = "ti"."tournament_id")))
  WHERE (("tc"."id" = "matches"."tournament_category_id") AND (("ti"."email")::"text" = (( SELECT "users"."email"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("ti"."status" = 'accepted'::"public"."invitation_status_enum"))))));


CREATE POLICY "player_sports_write" ON "public"."player_sports" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "player_sports"."team_id") AND ("teams"."user_id" = "auth"."uid"())))));


CREATE POLICY "players_write" ON "public"."players" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."player_sports" "ps"
     JOIN "public"."teams" "t" ON (("ps"."team_id" = "t"."id")))
  WHERE (("ps"."player_id" = "players"."id") AND ("t"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ((("public"."player_sports" "ps"
     JOIN "public"."tournament_teams" "tt" ON (("ps"."team_id" = "tt"."team_id")))
     JOIN "public"."tournament_categories" "tc" ON (("tt"."tournament_category_id" = "tc"."id")))
     JOIN "public"."tournaments" "tr" ON (("tc"."tournament_id" = "tr"."id")))
  WHERE (("ps"."player_id" = "players"."id") AND ("tr"."organizer_id" = "auth"."uid"()))))));


CREATE POLICY "sports_all" ON "public"."sports" TO "authenticated" USING ((( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true));



CREATE POLICY "teams_insert" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "users"."is_team_manager"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true) OR ("auth"."uid"() = "user_id")));




CREATE POLICY "tournament_categories_write" ON "public"."tournament_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "tournament_categories"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))));


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


CREATE POLICY "tournament_sponsors_write" ON "public"."tournament_sponsors" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments"
  WHERE (("tournaments"."id" = "tournament_sponsors"."tournament_id") AND ("tournaments"."organizer_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_invitations"
  WHERE (("tournament_invitations"."tournament_id" = "tournament_invitations"."tournament_id") AND (("tournament_invitations"."email")::"text" = (( SELECT "users"."email"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("tournament_invitations"."status" = 'accepted'::"public"."invitation_status_enum") AND ("tournament_invitations"."role" = ANY (ARRAY['co_organizer'::"public"."invitation_role_enum", 'staff'::"public"."invitation_role_enum"])))))));


CREATE POLICY "tournament_teams_delete" ON "public"."tournament_teams" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "tournament_teams"."team_id") AND ("teams"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_categories" "tc"
     JOIN "public"."tournaments" "t" ON (("tc"."tournament_id" = "t"."id")))
  WHERE (("tc"."id" = "tournament_teams"."tournament_category_id") AND ("t"."organizer_id" = "auth"."uid"()))))));

CREATE POLICY "tournament_teams_insert" ON "public"."tournament_teams" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "tournament_teams"."team_id") AND ("teams"."user_id" = "auth"."uid"())))));


CREATE POLICY "tournament_teams_update" ON "public"."tournament_teams" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "tournament_teams"."team_id") AND ("teams"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_categories" "tc"
     JOIN "public"."tournaments" "t" ON (("tc"."tournament_id" = "t"."id")))
  WHERE (("tc"."id" = "tournament_teams"."tournament_category_id") AND ("t"."organizer_id" = "auth"."uid"()))))));


CREATE POLICY "tournaments_write" ON "public"."tournaments" TO "authenticated" USING ((("auth"."uid"() = "organizer_id") OR (( SELECT "users"."is_admin"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = true)));


CREATE POLICY "users_delete" ON "public"."users" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "id") OR (( SELECT "users_1"."is_admin"
   FROM "public"."users" "users_1"
  WHERE ("users_1"."id" = "auth"."uid"())) = true)));






