create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "moddatetime" with schema "extensions";


  create table "public"."announcements" (
    "id" uuid not null default gen_random_uuid(),
    "tournament_id" uuid not null,
    "title" text not null,
    "content" text,
    "is_pinned" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."announcements" enable row level security;


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text not null,
    "target_type" text not null,
    "target_id" text not null,
    "details" jsonb,
    "ip_address" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."bug_reports" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "user_email" text,
    "message" text not null,
    "status" text default 'unread'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."bug_reports" enable row level security;


  create table "public"."global_players" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "photo_url" text,
    "date_of_birth" date,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "id_card_url" text
      );


alter table "public"."global_players" enable row level security;


  create table "public"."goals" (
    "id" uuid not null default gen_random_uuid(),
    "match_id" uuid not null,
    "team_id" uuid not null,
    "player_name" text not null,
    "goal_time" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."goals" enable row level security;


  create table "public"."manager_plans" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text[],
    "price" numeric(10,2) not null default 0,
    "discounted_price" numeric(10,2),
    "duration" text,
    "max_teams" integer default 0,
    "max_players_per_team" integer default 0,
    "support_level" text default 'Standard'::text,
    "recommended" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."manager_plans" enable row level security;


  create table "public"."match_events" (
    "id" uuid not null default gen_random_uuid(),
    "match_id" uuid not null,
    "team_id" uuid not null,
    "player_id" uuid,
    "event_type" text not null,
    "minute" integer not null,
    "extra_info" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."match_events" enable row level security;


  create table "public"."matches" (
    "id" uuid not null default gen_random_uuid(),
    "tournament_id" uuid not null,
    "home_team_id" uuid,
    "away_team_id" uuid,
    "home_score" integer default 0,
    "away_score" integer default 0,
    "round" integer not null default 1,
    "stage" text not null default 'league'::text,
    "winner_id" uuid,
    "is_manual" boolean not null default false,
    "status" text not null default 'scheduled'::text,
    "match_date" date,
    "match_time" time without time zone,
    "venue" text,
    "venue_id" uuid,
    "penalty_home_score" integer default 0,
    "penalty_away_score" integer default 0,
    "pitch_number" integer,
    "match_index" integer,
    "timer_status" text default 'stopped'::text,
    "elapsed_before_pause" integer default 0,
    "current_minute" integer,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."matches" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "message" text not null,
    "link" text,
    "is_read" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."organizer_plans" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text[],
    "price" numeric(10,2) not null default 0,
    "discounted_price" numeric(10,2),
    "duration" text,
    "max_tournaments" integer default 0,
    "max_teams_per_tournament" integer default 0,
    "format_support" text default 'Basic'::text,
    "invite_enabled" boolean default false,
    "register_enabled" boolean default false,
    "stats_support" text default 'Basic'::text,
    "support_level" text default 'Standard'::text,
    "recommended" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."organizer_plans" enable row level security;


  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "tournament_id" uuid,
    "amount" numeric(10,2) not null,
    "status" text not null,
    "payment_method" text not null,
    "plan" text not null,
    "provider_id" text,
    "subscription_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."payments" enable row level security;


  create table "public"."penalty_shootouts" (
    "id" uuid not null default gen_random_uuid(),
    "match_id" uuid not null,
    "team_id" uuid not null,
    "player_id" uuid,
    "round" integer not null,
    "scored" boolean not null default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."penalty_shootouts" enable row level security;


  create table "public"."players" (
    "id" uuid not null default gen_random_uuid(),
    "team_id" uuid,
    "name" text not null,
    "number" integer,
    "position" text,
    "global_player_id" uuid,
    "created_at" timestamp with time zone default now(),
    "global_team_id" uuid,
    "birth_date" date,
    "photo_url" text
      );


alter table "public"."players" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "full_name" text,
    "avatar_url" text,
    "role" text default 'user'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_organizer" boolean default false
      );


alter table "public"."profiles" enable row level security;


  create table "public"."registrations" (
    "id" uuid not null default gen_random_uuid(),
    "tournament_id" uuid not null,
    "team_name" text not null,
    "contact_name" text not null,
    "contact_phone" text not null,
    "slip_url" text,
    "payment_status" text default 'PENDING'::text,
    "trans_ref" text,
    "created_at" timestamp with time zone default now(),
    "user_id" uuid,
    "logo_url" text,
    "existing_team_id" uuid,
    "tournament_team_id" uuid,
    "description" text
      );


alter table "public"."registrations" enable row level security;


  create table "public"."team_payments" (
    "id" uuid not null default gen_random_uuid(),
    "tournament_id" uuid not null,
    "team_id" uuid not null,
    "amount" numeric(10,2) default 0,
    "status" text default 'pending'::text,
    "paid_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."team_payments" enable row level security;


  create table "public"."teams" (
    "id" uuid not null default gen_random_uuid(),
    "tournament_id" uuid,
    "name" text not null,
    "group_name" text,
    "logo_url" text,
    "created_at" timestamp with time zone default now(),
    "user_id" uuid,
    "description" text,
    "is_roster_locked" boolean default false
      );


alter table "public"."teams" enable row level security;


  create table "public"."tournament_members" (
    "id" uuid not null default gen_random_uuid(),
    "tournament_id" uuid not null,
    "user_id" uuid,
    "email" text,
    "role" text not null default 'viewer'::text,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."tournament_members" enable row level security;


  create table "public"."tournament_rules" (
    "tournament_id" uuid not null,
    "half_duration" integer default 45,
    "extra_time_duration" integer default 15,
    "max_squad_size" integer,
    "min_squad_size" integer,
    "max_substitutions" integer default 5,
    "yellow_card_ban_threshold" integer default 3,
    "red_card_ban_matches" integer default 1,
    "points_for_win" integer default 3,
    "points_for_draw" integer default 1,
    "points_for_loss" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."tournament_rules" enable row level security;


  create table "public"."tournament_teams" (
    "id" uuid not null default gen_random_uuid(),
    "tournament_id" uuid,
    "team_id" uuid,
    "user_id" uuid,
    "name" text not null,
    "description" text,
    "group_name" text,
    "logo_url" text,
    "is_roster_locked" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."tournament_teams" enable row level security;


  create table "public"."tournaments" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "format" text not null default 'league'::text,
    "status" text not null default 'draft'::text,
    "start_date" date,
    "end_date" date,
    "number_of_pitches" integer default 1,
    "max_teams" integer default 8,
    "is_registration_open" boolean default false,
    "registration_fee" numeric default 0,
    "bank_name" text,
    "bank_account_name" text,
    "bank_account_number" text,
    "plan" text default 'free'::text,
    "payment_status" text,
    "payment_id" text,
    "payment_method" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "advancing_teams" integer,
    "description" text,
    "document_deadline" timestamp with time zone
      );


alter table "public"."tournaments" enable row level security;


  create table "public"."venues" (
    "id" uuid not null default gen_random_uuid(),
    "tournament_id" uuid not null,
    "name" text not null,
    "address" text,
    "google_maps_url" text,
    "capacity" integer,
    "notes" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."venues" enable row level security;

CREATE UNIQUE INDEX announcements_pkey ON public.announcements USING btree (id);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX bug_reports_pkey ON public.bug_reports USING btree (id);

CREATE UNIQUE INDEX global_players_pkey ON public.global_players USING btree (id);

CREATE UNIQUE INDEX goals_pkey ON public.goals USING btree (id);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);

CREATE INDEX idx_bug_reports_status ON public.bug_reports USING btree (status);

CREATE INDEX idx_match_events_match_id ON public.match_events USING btree (match_id);

CREATE INDEX idx_matches_tournament_id ON public.matches USING btree (tournament_id);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);

CREATE INDEX idx_players_team_id ON public.players USING btree (team_id);

CREATE INDEX idx_registrations_tournament_id ON public.registrations USING btree (tournament_id);

CREATE INDEX idx_team_payments_tournament_id ON public.team_payments USING btree (tournament_id);

CREATE INDEX idx_teams_tournament_id ON public.teams USING btree (tournament_id);

CREATE INDEX idx_tournaments_user_id ON public.tournaments USING btree (user_id);

CREATE UNIQUE INDEX manager_plans_name_key ON public.manager_plans USING btree (name);

CREATE UNIQUE INDEX manager_plans_pkey ON public.manager_plans USING btree (id);

CREATE UNIQUE INDEX match_events_pkey ON public.match_events USING btree (id);

CREATE UNIQUE INDEX matches_pkey ON public.matches USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX organizer_plans_name_key ON public.organizer_plans USING btree (name);

CREATE UNIQUE INDEX organizer_plans_pkey ON public.organizer_plans USING btree (id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX penalty_shootouts_pkey ON public.penalty_shootouts USING btree (id);

CREATE UNIQUE INDEX players_pkey ON public.players USING btree (id);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX registrations_pkey ON public.registrations USING btree (id);

CREATE UNIQUE INDEX team_payments_pkey ON public.team_payments USING btree (id);

CREATE UNIQUE INDEX team_payments_tournament_id_team_id_key ON public.team_payments USING btree (tournament_id, team_id);

CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);

CREATE UNIQUE INDEX tournament_members_pkey ON public.tournament_members USING btree (id);

CREATE UNIQUE INDEX tournament_members_tournament_id_email_key ON public.tournament_members USING btree (tournament_id, email);

CREATE UNIQUE INDEX tournament_members_tournament_id_user_id_key ON public.tournament_members USING btree (tournament_id, user_id);

CREATE UNIQUE INDEX tournament_rules_pkey ON public.tournament_rules USING btree (tournament_id);

CREATE UNIQUE INDEX tournament_teams_pkey ON public.tournament_teams USING btree (id);

CREATE UNIQUE INDEX tournaments_pkey ON public.tournaments USING btree (id);

CREATE UNIQUE INDEX venues_pkey ON public.venues USING btree (id);

alter table "public"."announcements" add constraint "announcements_pkey" PRIMARY KEY using index "announcements_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."bug_reports" add constraint "bug_reports_pkey" PRIMARY KEY using index "bug_reports_pkey";

alter table "public"."global_players" add constraint "global_players_pkey" PRIMARY KEY using index "global_players_pkey";

alter table "public"."goals" add constraint "goals_pkey" PRIMARY KEY using index "goals_pkey";

alter table "public"."manager_plans" add constraint "manager_plans_pkey" PRIMARY KEY using index "manager_plans_pkey";

alter table "public"."match_events" add constraint "match_events_pkey" PRIMARY KEY using index "match_events_pkey";

alter table "public"."matches" add constraint "matches_pkey" PRIMARY KEY using index "matches_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."organizer_plans" add constraint "organizer_plans_pkey" PRIMARY KEY using index "organizer_plans_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."penalty_shootouts" add constraint "penalty_shootouts_pkey" PRIMARY KEY using index "penalty_shootouts_pkey";

alter table "public"."players" add constraint "players_pkey" PRIMARY KEY using index "players_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."registrations" add constraint "registrations_pkey" PRIMARY KEY using index "registrations_pkey";

alter table "public"."team_payments" add constraint "team_payments_pkey" PRIMARY KEY using index "team_payments_pkey";

alter table "public"."teams" add constraint "teams_pkey" PRIMARY KEY using index "teams_pkey";

alter table "public"."tournament_members" add constraint "tournament_members_pkey" PRIMARY KEY using index "tournament_members_pkey";

alter table "public"."tournament_rules" add constraint "tournament_rules_pkey" PRIMARY KEY using index "tournament_rules_pkey";

alter table "public"."tournament_teams" add constraint "tournament_teams_pkey" PRIMARY KEY using index "tournament_teams_pkey";

alter table "public"."tournaments" add constraint "tournaments_pkey" PRIMARY KEY using index "tournaments_pkey";

alter table "public"."venues" add constraint "venues_pkey" PRIMARY KEY using index "venues_pkey";

alter table "public"."announcements" add constraint "announcements_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."announcements" validate constraint "announcements_tournament_id_fkey";

alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

alter table "public"."bug_reports" add constraint "bug_reports_status_check" CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'resolved'::text]))) not valid;

alter table "public"."bug_reports" validate constraint "bug_reports_status_check";

alter table "public"."bug_reports" add constraint "bug_reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."bug_reports" validate constraint "bug_reports_user_id_fkey";

alter table "public"."global_players" add constraint "global_players_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."global_players" validate constraint "global_players_created_by_fkey";

alter table "public"."goals" add constraint "goals_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE not valid;

alter table "public"."goals" validate constraint "goals_match_id_fkey";

alter table "public"."goals" add constraint "goals_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE not valid;

alter table "public"."goals" validate constraint "goals_team_id_fkey";

alter table "public"."manager_plans" add constraint "manager_plans_name_key" UNIQUE using index "manager_plans_name_key";

alter table "public"."match_events" add constraint "match_events_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE not valid;

alter table "public"."match_events" validate constraint "match_events_match_id_fkey";

alter table "public"."match_events" add constraint "match_events_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL not valid;

alter table "public"."match_events" validate constraint "match_events_player_id_fkey";

alter table "public"."match_events" add constraint "match_events_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE not valid;

alter table "public"."match_events" validate constraint "match_events_team_id_fkey";

alter table "public"."matches" add constraint "matches_away_team_id_fkey" FOREIGN KEY (away_team_id) REFERENCES public.tournament_teams(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_away_team_id_fkey";

alter table "public"."matches" add constraint "matches_home_team_id_fkey" FOREIGN KEY (home_team_id) REFERENCES public.tournament_teams(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_home_team_id_fkey";

alter table "public"."matches" add constraint "matches_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."matches" validate constraint "matches_tournament_id_fkey";

alter table "public"."matches" add constraint "matches_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_venue_id_fkey";

alter table "public"."matches" add constraint "matches_winner_id_fkey" FOREIGN KEY (winner_id) REFERENCES public.tournament_teams(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_winner_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."organizer_plans" add constraint "organizer_plans_name_key" UNIQUE using index "organizer_plans_name_key";

alter table "public"."payments" add constraint "payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'refunded'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_status_check";

alter table "public"."payments" add constraint "payments_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_tournament_id_fkey";

alter table "public"."payments" add constraint "payments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_user_id_fkey";

alter table "public"."penalty_shootouts" add constraint "penalty_shootouts_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE not valid;

alter table "public"."penalty_shootouts" validate constraint "penalty_shootouts_match_id_fkey";

alter table "public"."penalty_shootouts" add constraint "penalty_shootouts_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL not valid;

alter table "public"."penalty_shootouts" validate constraint "penalty_shootouts_player_id_fkey";

alter table "public"."penalty_shootouts" add constraint "penalty_shootouts_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE not valid;

alter table "public"."penalty_shootouts" validate constraint "penalty_shootouts_team_id_fkey";

alter table "public"."players" add constraint "players_global_player_id_fkey" FOREIGN KEY (global_player_id) REFERENCES public.global_players(id) ON DELETE SET NULL not valid;

alter table "public"."players" validate constraint "players_global_player_id_fkey";

alter table "public"."players" add constraint "players_global_team_id_fkey" FOREIGN KEY (global_team_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."players" validate constraint "players_global_team_id_fkey";

alter table "public"."players" add constraint "players_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.tournament_teams(id) ON DELETE CASCADE not valid;

alter table "public"."players" validate constraint "players_team_id_fkey";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."registrations" add constraint "registrations_existing_team_id_fkey" FOREIGN KEY (existing_team_id) REFERENCES public.teams(id) ON DELETE SET NULL not valid;

alter table "public"."registrations" validate constraint "registrations_existing_team_id_fkey";

alter table "public"."registrations" add constraint "registrations_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."registrations" validate constraint "registrations_tournament_id_fkey";

alter table "public"."registrations" add constraint "registrations_tournament_team_id_fkey" FOREIGN KEY (tournament_team_id) REFERENCES public.tournament_teams(id) ON DELETE SET NULL not valid;

alter table "public"."registrations" validate constraint "registrations_tournament_team_id_fkey";

alter table "public"."registrations" add constraint "registrations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."registrations" validate constraint "registrations_user_id_fkey";

alter table "public"."team_payments" add constraint "team_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'waived'::text]))) not valid;

alter table "public"."team_payments" validate constraint "team_payments_status_check";

alter table "public"."team_payments" add constraint "team_payments_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."team_payments" validate constraint "team_payments_team_id_fkey";

alter table "public"."team_payments" add constraint "team_payments_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."team_payments" validate constraint "team_payments_tournament_id_fkey";

alter table "public"."team_payments" add constraint "team_payments_tournament_id_team_id_key" UNIQUE using index "team_payments_tournament_id_team_id_key";

alter table "public"."teams" add constraint "teams_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."teams" validate constraint "teams_tournament_id_fkey";

alter table "public"."teams" add constraint "teams_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."teams" validate constraint "teams_user_id_fkey";

alter table "public"."tournament_members" add constraint "tournament_members_tournament_id_email_key" UNIQUE using index "tournament_members_tournament_id_email_key";

alter table "public"."tournament_members" add constraint "tournament_members_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_members" validate constraint "tournament_members_tournament_id_fkey";

alter table "public"."tournament_members" add constraint "tournament_members_tournament_id_user_id_key" UNIQUE using index "tournament_members_tournament_id_user_id_key";

alter table "public"."tournament_members" add constraint "tournament_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."tournament_members" validate constraint "tournament_members_user_id_fkey";

alter table "public"."tournament_rules" add constraint "tournament_rules_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_rules" validate constraint "tournament_rules_tournament_id_fkey";

alter table "public"."tournament_teams" add constraint "tournament_teams_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL not valid;

alter table "public"."tournament_teams" validate constraint "tournament_teams_team_id_fkey";

alter table "public"."tournament_teams" add constraint "tournament_teams_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_teams" validate constraint "tournament_teams_tournament_id_fkey";

alter table "public"."tournament_teams" add constraint "tournament_teams_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."tournament_teams" validate constraint "tournament_teams_user_id_fkey";

alter table "public"."tournaments" add constraint "tournaments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."tournaments" validate constraint "tournaments_user_id_fkey";

alter table "public"."venues" add constraint "venues_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."venues" validate constraint "venues_tournament_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_get_auth_logs()
 RETURNS TABLE(id uuid, payload json, created_at timestamp with time zone, ip_address character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only allow admins
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.payload,
        a.created_at,
        a.ip_address::VARCHAR
    FROM auth.audit_log_entries a
    ORDER BY a.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_tournament_manager(tourney_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tournaments WHERE id = tourney_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.tournament_members 
        WHERE tournament_id = tourney_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'editor')
        AND status = 'accepted'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."announcements" to "anon";

grant insert on table "public"."announcements" to "anon";

grant references on table "public"."announcements" to "anon";

grant select on table "public"."announcements" to "anon";

grant trigger on table "public"."announcements" to "anon";

grant truncate on table "public"."announcements" to "anon";

grant update on table "public"."announcements" to "anon";

grant delete on table "public"."announcements" to "authenticated";

grant insert on table "public"."announcements" to "authenticated";

grant references on table "public"."announcements" to "authenticated";

grant select on table "public"."announcements" to "authenticated";

grant trigger on table "public"."announcements" to "authenticated";

grant truncate on table "public"."announcements" to "authenticated";

grant update on table "public"."announcements" to "authenticated";

grant delete on table "public"."announcements" to "service_role";

grant insert on table "public"."announcements" to "service_role";

grant references on table "public"."announcements" to "service_role";

grant select on table "public"."announcements" to "service_role";

grant trigger on table "public"."announcements" to "service_role";

grant truncate on table "public"."announcements" to "service_role";

grant update on table "public"."announcements" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."bug_reports" to "anon";

grant insert on table "public"."bug_reports" to "anon";

grant references on table "public"."bug_reports" to "anon";

grant select on table "public"."bug_reports" to "anon";

grant trigger on table "public"."bug_reports" to "anon";

grant truncate on table "public"."bug_reports" to "anon";

grant update on table "public"."bug_reports" to "anon";

grant delete on table "public"."bug_reports" to "authenticated";

grant insert on table "public"."bug_reports" to "authenticated";

grant references on table "public"."bug_reports" to "authenticated";

grant select on table "public"."bug_reports" to "authenticated";

grant trigger on table "public"."bug_reports" to "authenticated";

grant truncate on table "public"."bug_reports" to "authenticated";

grant update on table "public"."bug_reports" to "authenticated";

grant delete on table "public"."bug_reports" to "service_role";

grant insert on table "public"."bug_reports" to "service_role";

grant references on table "public"."bug_reports" to "service_role";

grant select on table "public"."bug_reports" to "service_role";

grant trigger on table "public"."bug_reports" to "service_role";

grant truncate on table "public"."bug_reports" to "service_role";

grant update on table "public"."bug_reports" to "service_role";

grant delete on table "public"."global_players" to "anon";

grant insert on table "public"."global_players" to "anon";

grant references on table "public"."global_players" to "anon";

grant select on table "public"."global_players" to "anon";

grant trigger on table "public"."global_players" to "anon";

grant truncate on table "public"."global_players" to "anon";

grant update on table "public"."global_players" to "anon";

grant delete on table "public"."global_players" to "authenticated";

grant insert on table "public"."global_players" to "authenticated";

grant references on table "public"."global_players" to "authenticated";

grant select on table "public"."global_players" to "authenticated";

grant trigger on table "public"."global_players" to "authenticated";

grant truncate on table "public"."global_players" to "authenticated";

grant update on table "public"."global_players" to "authenticated";

grant delete on table "public"."global_players" to "service_role";

grant insert on table "public"."global_players" to "service_role";

grant references on table "public"."global_players" to "service_role";

grant select on table "public"."global_players" to "service_role";

grant trigger on table "public"."global_players" to "service_role";

grant truncate on table "public"."global_players" to "service_role";

grant update on table "public"."global_players" to "service_role";

grant delete on table "public"."goals" to "anon";

grant insert on table "public"."goals" to "anon";

grant references on table "public"."goals" to "anon";

grant select on table "public"."goals" to "anon";

grant trigger on table "public"."goals" to "anon";

grant truncate on table "public"."goals" to "anon";

grant update on table "public"."goals" to "anon";

grant delete on table "public"."goals" to "authenticated";

grant insert on table "public"."goals" to "authenticated";

grant references on table "public"."goals" to "authenticated";

grant select on table "public"."goals" to "authenticated";

grant trigger on table "public"."goals" to "authenticated";

grant truncate on table "public"."goals" to "authenticated";

grant update on table "public"."goals" to "authenticated";

grant delete on table "public"."goals" to "service_role";

grant insert on table "public"."goals" to "service_role";

grant references on table "public"."goals" to "service_role";

grant select on table "public"."goals" to "service_role";

grant trigger on table "public"."goals" to "service_role";

grant truncate on table "public"."goals" to "service_role";

grant update on table "public"."goals" to "service_role";

grant delete on table "public"."manager_plans" to "anon";

grant insert on table "public"."manager_plans" to "anon";

grant references on table "public"."manager_plans" to "anon";

grant select on table "public"."manager_plans" to "anon";

grant trigger on table "public"."manager_plans" to "anon";

grant truncate on table "public"."manager_plans" to "anon";

grant update on table "public"."manager_plans" to "anon";

grant delete on table "public"."manager_plans" to "authenticated";

grant insert on table "public"."manager_plans" to "authenticated";

grant references on table "public"."manager_plans" to "authenticated";

grant select on table "public"."manager_plans" to "authenticated";

grant trigger on table "public"."manager_plans" to "authenticated";

grant truncate on table "public"."manager_plans" to "authenticated";

grant update on table "public"."manager_plans" to "authenticated";

grant delete on table "public"."manager_plans" to "service_role";

grant insert on table "public"."manager_plans" to "service_role";

grant references on table "public"."manager_plans" to "service_role";

grant select on table "public"."manager_plans" to "service_role";

grant trigger on table "public"."manager_plans" to "service_role";

grant truncate on table "public"."manager_plans" to "service_role";

grant update on table "public"."manager_plans" to "service_role";

grant delete on table "public"."match_events" to "anon";

grant insert on table "public"."match_events" to "anon";

grant references on table "public"."match_events" to "anon";

grant select on table "public"."match_events" to "anon";

grant trigger on table "public"."match_events" to "anon";

grant truncate on table "public"."match_events" to "anon";

grant update on table "public"."match_events" to "anon";

grant delete on table "public"."match_events" to "authenticated";

grant insert on table "public"."match_events" to "authenticated";

grant references on table "public"."match_events" to "authenticated";

grant select on table "public"."match_events" to "authenticated";

grant trigger on table "public"."match_events" to "authenticated";

grant truncate on table "public"."match_events" to "authenticated";

grant update on table "public"."match_events" to "authenticated";

grant delete on table "public"."match_events" to "service_role";

grant insert on table "public"."match_events" to "service_role";

grant references on table "public"."match_events" to "service_role";

grant select on table "public"."match_events" to "service_role";

grant trigger on table "public"."match_events" to "service_role";

grant truncate on table "public"."match_events" to "service_role";

grant update on table "public"."match_events" to "service_role";

grant delete on table "public"."matches" to "anon";

grant insert on table "public"."matches" to "anon";

grant references on table "public"."matches" to "anon";

grant select on table "public"."matches" to "anon";

grant trigger on table "public"."matches" to "anon";

grant truncate on table "public"."matches" to "anon";

grant update on table "public"."matches" to "anon";

grant delete on table "public"."matches" to "authenticated";

grant insert on table "public"."matches" to "authenticated";

grant references on table "public"."matches" to "authenticated";

grant select on table "public"."matches" to "authenticated";

grant trigger on table "public"."matches" to "authenticated";

grant truncate on table "public"."matches" to "authenticated";

grant update on table "public"."matches" to "authenticated";

grant delete on table "public"."matches" to "service_role";

grant insert on table "public"."matches" to "service_role";

grant references on table "public"."matches" to "service_role";

grant select on table "public"."matches" to "service_role";

grant trigger on table "public"."matches" to "service_role";

grant truncate on table "public"."matches" to "service_role";

grant update on table "public"."matches" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."organizer_plans" to "anon";

grant insert on table "public"."organizer_plans" to "anon";

grant references on table "public"."organizer_plans" to "anon";

grant select on table "public"."organizer_plans" to "anon";

grant trigger on table "public"."organizer_plans" to "anon";

grant truncate on table "public"."organizer_plans" to "anon";

grant update on table "public"."organizer_plans" to "anon";

grant delete on table "public"."organizer_plans" to "authenticated";

grant insert on table "public"."organizer_plans" to "authenticated";

grant references on table "public"."organizer_plans" to "authenticated";

grant select on table "public"."organizer_plans" to "authenticated";

grant trigger on table "public"."organizer_plans" to "authenticated";

grant truncate on table "public"."organizer_plans" to "authenticated";

grant update on table "public"."organizer_plans" to "authenticated";

grant delete on table "public"."organizer_plans" to "service_role";

grant insert on table "public"."organizer_plans" to "service_role";

grant references on table "public"."organizer_plans" to "service_role";

grant select on table "public"."organizer_plans" to "service_role";

grant trigger on table "public"."organizer_plans" to "service_role";

grant truncate on table "public"."organizer_plans" to "service_role";

grant update on table "public"."organizer_plans" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."penalty_shootouts" to "anon";

grant insert on table "public"."penalty_shootouts" to "anon";

grant references on table "public"."penalty_shootouts" to "anon";

grant select on table "public"."penalty_shootouts" to "anon";

grant trigger on table "public"."penalty_shootouts" to "anon";

grant truncate on table "public"."penalty_shootouts" to "anon";

grant update on table "public"."penalty_shootouts" to "anon";

grant delete on table "public"."penalty_shootouts" to "authenticated";

grant insert on table "public"."penalty_shootouts" to "authenticated";

grant references on table "public"."penalty_shootouts" to "authenticated";

grant select on table "public"."penalty_shootouts" to "authenticated";

grant trigger on table "public"."penalty_shootouts" to "authenticated";

grant truncate on table "public"."penalty_shootouts" to "authenticated";

grant update on table "public"."penalty_shootouts" to "authenticated";

grant delete on table "public"."penalty_shootouts" to "service_role";

grant insert on table "public"."penalty_shootouts" to "service_role";

grant references on table "public"."penalty_shootouts" to "service_role";

grant select on table "public"."penalty_shootouts" to "service_role";

grant trigger on table "public"."penalty_shootouts" to "service_role";

grant truncate on table "public"."penalty_shootouts" to "service_role";

grant update on table "public"."penalty_shootouts" to "service_role";

grant delete on table "public"."players" to "anon";

grant insert on table "public"."players" to "anon";

grant references on table "public"."players" to "anon";

grant select on table "public"."players" to "anon";

grant trigger on table "public"."players" to "anon";

grant truncate on table "public"."players" to "anon";

grant update on table "public"."players" to "anon";

grant delete on table "public"."players" to "authenticated";

grant insert on table "public"."players" to "authenticated";

grant references on table "public"."players" to "authenticated";

grant select on table "public"."players" to "authenticated";

grant trigger on table "public"."players" to "authenticated";

grant truncate on table "public"."players" to "authenticated";

grant update on table "public"."players" to "authenticated";

grant delete on table "public"."players" to "service_role";

grant insert on table "public"."players" to "service_role";

grant references on table "public"."players" to "service_role";

grant select on table "public"."players" to "service_role";

grant trigger on table "public"."players" to "service_role";

grant truncate on table "public"."players" to "service_role";

grant update on table "public"."players" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."registrations" to "anon";

grant insert on table "public"."registrations" to "anon";

grant references on table "public"."registrations" to "anon";

grant select on table "public"."registrations" to "anon";

grant trigger on table "public"."registrations" to "anon";

grant truncate on table "public"."registrations" to "anon";

grant update on table "public"."registrations" to "anon";

grant delete on table "public"."registrations" to "authenticated";

grant insert on table "public"."registrations" to "authenticated";

grant references on table "public"."registrations" to "authenticated";

grant select on table "public"."registrations" to "authenticated";

grant trigger on table "public"."registrations" to "authenticated";

grant truncate on table "public"."registrations" to "authenticated";

grant update on table "public"."registrations" to "authenticated";

grant delete on table "public"."registrations" to "service_role";

grant insert on table "public"."registrations" to "service_role";

grant references on table "public"."registrations" to "service_role";

grant select on table "public"."registrations" to "service_role";

grant trigger on table "public"."registrations" to "service_role";

grant truncate on table "public"."registrations" to "service_role";

grant update on table "public"."registrations" to "service_role";

grant delete on table "public"."team_payments" to "anon";

grant insert on table "public"."team_payments" to "anon";

grant references on table "public"."team_payments" to "anon";

grant select on table "public"."team_payments" to "anon";

grant trigger on table "public"."team_payments" to "anon";

grant truncate on table "public"."team_payments" to "anon";

grant update on table "public"."team_payments" to "anon";

grant delete on table "public"."team_payments" to "authenticated";

grant insert on table "public"."team_payments" to "authenticated";

grant references on table "public"."team_payments" to "authenticated";

grant select on table "public"."team_payments" to "authenticated";

grant trigger on table "public"."team_payments" to "authenticated";

grant truncate on table "public"."team_payments" to "authenticated";

grant update on table "public"."team_payments" to "authenticated";

grant delete on table "public"."team_payments" to "service_role";

grant insert on table "public"."team_payments" to "service_role";

grant references on table "public"."team_payments" to "service_role";

grant select on table "public"."team_payments" to "service_role";

grant trigger on table "public"."team_payments" to "service_role";

grant truncate on table "public"."team_payments" to "service_role";

grant update on table "public"."team_payments" to "service_role";

grant delete on table "public"."teams" to "anon";

grant insert on table "public"."teams" to "anon";

grant references on table "public"."teams" to "anon";

grant select on table "public"."teams" to "anon";

grant trigger on table "public"."teams" to "anon";

grant truncate on table "public"."teams" to "anon";

grant update on table "public"."teams" to "anon";

grant delete on table "public"."teams" to "authenticated";

grant insert on table "public"."teams" to "authenticated";

grant references on table "public"."teams" to "authenticated";

grant select on table "public"."teams" to "authenticated";

grant trigger on table "public"."teams" to "authenticated";

grant truncate on table "public"."teams" to "authenticated";

grant update on table "public"."teams" to "authenticated";

grant delete on table "public"."teams" to "service_role";

grant insert on table "public"."teams" to "service_role";

grant references on table "public"."teams" to "service_role";

grant select on table "public"."teams" to "service_role";

grant trigger on table "public"."teams" to "service_role";

grant truncate on table "public"."teams" to "service_role";

grant update on table "public"."teams" to "service_role";

grant delete on table "public"."tournament_members" to "anon";

grant insert on table "public"."tournament_members" to "anon";

grant references on table "public"."tournament_members" to "anon";

grant select on table "public"."tournament_members" to "anon";

grant trigger on table "public"."tournament_members" to "anon";

grant truncate on table "public"."tournament_members" to "anon";

grant update on table "public"."tournament_members" to "anon";

grant delete on table "public"."tournament_members" to "authenticated";

grant insert on table "public"."tournament_members" to "authenticated";

grant references on table "public"."tournament_members" to "authenticated";

grant select on table "public"."tournament_members" to "authenticated";

grant trigger on table "public"."tournament_members" to "authenticated";

grant truncate on table "public"."tournament_members" to "authenticated";

grant update on table "public"."tournament_members" to "authenticated";

grant delete on table "public"."tournament_members" to "service_role";

grant insert on table "public"."tournament_members" to "service_role";

grant references on table "public"."tournament_members" to "service_role";

grant select on table "public"."tournament_members" to "service_role";

grant trigger on table "public"."tournament_members" to "service_role";

grant truncate on table "public"."tournament_members" to "service_role";

grant update on table "public"."tournament_members" to "service_role";

grant delete on table "public"."tournament_rules" to "anon";

grant insert on table "public"."tournament_rules" to "anon";

grant references on table "public"."tournament_rules" to "anon";

grant select on table "public"."tournament_rules" to "anon";

grant trigger on table "public"."tournament_rules" to "anon";

grant truncate on table "public"."tournament_rules" to "anon";

grant update on table "public"."tournament_rules" to "anon";

grant delete on table "public"."tournament_rules" to "authenticated";

grant insert on table "public"."tournament_rules" to "authenticated";

grant references on table "public"."tournament_rules" to "authenticated";

grant select on table "public"."tournament_rules" to "authenticated";

grant trigger on table "public"."tournament_rules" to "authenticated";

grant truncate on table "public"."tournament_rules" to "authenticated";

grant update on table "public"."tournament_rules" to "authenticated";

grant delete on table "public"."tournament_rules" to "service_role";

grant insert on table "public"."tournament_rules" to "service_role";

grant references on table "public"."tournament_rules" to "service_role";

grant select on table "public"."tournament_rules" to "service_role";

grant trigger on table "public"."tournament_rules" to "service_role";

grant truncate on table "public"."tournament_rules" to "service_role";

grant update on table "public"."tournament_rules" to "service_role";

grant delete on table "public"."tournament_teams" to "anon";

grant insert on table "public"."tournament_teams" to "anon";

grant references on table "public"."tournament_teams" to "anon";

grant select on table "public"."tournament_teams" to "anon";

grant trigger on table "public"."tournament_teams" to "anon";

grant truncate on table "public"."tournament_teams" to "anon";

grant update on table "public"."tournament_teams" to "anon";

grant delete on table "public"."tournament_teams" to "authenticated";

grant insert on table "public"."tournament_teams" to "authenticated";

grant references on table "public"."tournament_teams" to "authenticated";

grant select on table "public"."tournament_teams" to "authenticated";

grant trigger on table "public"."tournament_teams" to "authenticated";

grant truncate on table "public"."tournament_teams" to "authenticated";

grant update on table "public"."tournament_teams" to "authenticated";

grant delete on table "public"."tournament_teams" to "service_role";

grant insert on table "public"."tournament_teams" to "service_role";

grant references on table "public"."tournament_teams" to "service_role";

grant select on table "public"."tournament_teams" to "service_role";

grant trigger on table "public"."tournament_teams" to "service_role";

grant truncate on table "public"."tournament_teams" to "service_role";

grant update on table "public"."tournament_teams" to "service_role";

grant delete on table "public"."tournaments" to "anon";

grant insert on table "public"."tournaments" to "anon";

grant references on table "public"."tournaments" to "anon";

grant select on table "public"."tournaments" to "anon";

grant trigger on table "public"."tournaments" to "anon";

grant truncate on table "public"."tournaments" to "anon";

grant update on table "public"."tournaments" to "anon";

grant delete on table "public"."tournaments" to "authenticated";

grant insert on table "public"."tournaments" to "authenticated";

grant references on table "public"."tournaments" to "authenticated";

grant select on table "public"."tournaments" to "authenticated";

grant trigger on table "public"."tournaments" to "authenticated";

grant truncate on table "public"."tournaments" to "authenticated";

grant update on table "public"."tournaments" to "authenticated";

grant delete on table "public"."tournaments" to "service_role";

grant insert on table "public"."tournaments" to "service_role";

grant references on table "public"."tournaments" to "service_role";

grant select on table "public"."tournaments" to "service_role";

grant trigger on table "public"."tournaments" to "service_role";

grant truncate on table "public"."tournaments" to "service_role";

grant update on table "public"."tournaments" to "service_role";

grant delete on table "public"."venues" to "anon";

grant insert on table "public"."venues" to "anon";

grant references on table "public"."venues" to "anon";

grant select on table "public"."venues" to "anon";

grant trigger on table "public"."venues" to "anon";

grant truncate on table "public"."venues" to "anon";

grant update on table "public"."venues" to "anon";

grant delete on table "public"."venues" to "authenticated";

grant insert on table "public"."venues" to "authenticated";

grant references on table "public"."venues" to "authenticated";

grant select on table "public"."venues" to "authenticated";

grant trigger on table "public"."venues" to "authenticated";

grant truncate on table "public"."venues" to "authenticated";

grant update on table "public"."venues" to "authenticated";

grant delete on table "public"."venues" to "service_role";

grant insert on table "public"."venues" to "service_role";

grant references on table "public"."venues" to "service_role";

grant select on table "public"."venues" to "service_role";

grant trigger on table "public"."venues" to "service_role";

grant truncate on table "public"."venues" to "service_role";

grant update on table "public"."venues" to "service_role";


  create policy "Announcements viewable by everyone"
  on "public"."announcements"
  as permissive
  for select
  to public
using (true);



  create policy "Managers can manage announcements"
  on "public"."announcements"
  as permissive
  for all
  to public
using (public.is_tournament_manager(tournament_id));



  create policy "Admins can view all audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Users can insert their own audit logs"
  on "public"."audit_logs"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "Admins can update bug reports"
  on "public"."bug_reports"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check (true);



  create policy "Admins can view bug reports"
  on "public"."bug_reports"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Anyone can create bug reports"
  on "public"."bug_reports"
  as permissive
  for insert
  to authenticated
with check ((auth.role() = 'authenticated'::text));



  create policy "Users can create bug reports"
  on "public"."bug_reports"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "Users can view own bug reports"
  on "public"."bug_reports"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Global players viewable by everyone"
  on "public"."global_players"
  as permissive
  for select
  to public
using (true);



  create policy "Users can manage own global players"
  on "public"."global_players"
  as permissive
  for all
  to public
using ((auth.uid() = created_by));



  create policy "Goals viewable by everyone"
  on "public"."goals"
  as permissive
  for select
  to public
using (true);



  create policy "Managers can manage goals"
  on "public"."goals"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.matches
  WHERE ((matches.id = goals.match_id) AND public.is_tournament_manager(matches.tournament_id)))));



  create policy "Manager plans viewable by everyone"
  on "public"."manager_plans"
  as permissive
  for select
  to public
using (true);



  create policy "Managers can manage match events"
  on "public"."match_events"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.matches
  WHERE ((matches.id = match_events.match_id) AND public.is_tournament_manager(matches.tournament_id)))));



  create policy "Viewable by everyone"
  on "public"."match_events"
  as permissive
  for select
  to public
using (true);



  create policy "Managers can manage matches"
  on "public"."matches"
  as permissive
  for all
  to public
using (public.is_tournament_manager(tournament_id));



  create policy "Viewable by everyone"
  on "public"."matches"
  as permissive
  for select
  to public
using (true);



  create policy "Users can update own notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Organizer plans viewable by everyone"
  on "public"."organizer_plans"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own payments"
  on "public"."payments"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) AND (status = 'pending'::text)));



  create policy "Users can view their own payments"
  on "public"."payments"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Managers can manage penalty shootouts"
  on "public"."penalty_shootouts"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.matches
  WHERE ((matches.id = penalty_shootouts.match_id) AND public.is_tournament_manager(matches.tournament_id)))));



  create policy "Viewable by everyone"
  on "public"."penalty_shootouts"
  as permissive
  for select
  to public
using (true);



  create policy "Managers can manage players"
  on "public"."players"
  as permissive
  for all
  to public
using ((((global_team_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = players.global_team_id) AND (teams.user_id = auth.uid()))))) OR ((team_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.tournament_teams
  WHERE ((tournament_teams.id = tournament_teams.team_id) AND (public.is_tournament_manager(tournament_teams.tournament_id) OR (auth.uid() = tournament_teams.user_id))))))));



  create policy "Viewable by everyone"
  on "public"."players"
  as permissive
  for select
  to public
using (true);



  create policy "Public profiles are viewable by everyone"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Managers can update registrations"
  on "public"."registrations"
  as permissive
  for update
  to public
using (public.is_tournament_manager(tournament_id));



  create policy "Public can submit registrations"
  on "public"."registrations"
  as permissive
  for insert
  to authenticated
with check ((auth.role() = 'authenticated'::text));



  create policy "Tournament owners can view registrations"
  on "public"."registrations"
  as permissive
  for select
  to public
using (public.is_tournament_manager(tournament_id));



  create policy "Users can view own registrations"
  on "public"."registrations"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Authenticated users can see team payments"
  on "public"."team_payments"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Managers can handle team payments"
  on "public"."team_payments"
  as permissive
  for all
  to public
using (public.is_tournament_manager(tournament_id));



  create policy "Team managers can update own teams"
  on "public"."teams"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can manage own global teams"
  on "public"."teams"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Viewable by everyone"
  on "public"."teams"
  as permissive
  for select
  to public
using (true);



  create policy "Managers can delete tournament members"
  on "public"."tournament_members"
  as permissive
  for delete
  to public
using ((public.is_tournament_manager(tournament_id) OR (auth.uid() = user_id) OR ((status = 'pending'::text) AND (email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))))));



  create policy "Managers can insert tournament members"
  on "public"."tournament_members"
  as permissive
  for insert
  to public
with check (public.is_tournament_manager(tournament_id));



  create policy "Managers can update tournament members"
  on "public"."tournament_members"
  as permissive
  for update
  to public
using ((public.is_tournament_manager(tournament_id) OR (auth.uid() = user_id) OR ((status = 'pending'::text) AND (email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))))));



  create policy "Managers can view tournament members"
  on "public"."tournament_members"
  as permissive
  for select
  to public
using ((public.is_tournament_manager(tournament_id) OR (auth.uid() = user_id) OR (email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));



  create policy "Managers can manage tournament rules"
  on "public"."tournament_rules"
  as permissive
  for all
  to public
using (((EXISTS ( SELECT 1
   FROM public.tournaments
  WHERE ((tournaments.id = tournament_rules.tournament_id) AND (tournaments.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.tournament_members
  WHERE ((tournament_members.tournament_id = tournament_rules.tournament_id) AND (tournament_members.user_id = auth.uid()) AND (tournament_members.role = ANY (ARRAY['admin'::text, 'editor'::text])) AND (tournament_members.status = 'accepted'::text))))));



  create policy "Managers can manage tournament teams"
  on "public"."tournament_teams"
  as permissive
  for all
  to public
using ((public.is_tournament_manager(tournament_id) OR (auth.uid() = user_id)));



  create policy "Viewable by everyone"
  on "public"."tournament_teams"
  as permissive
  for select
  to public
using (true);



  create policy "Owners can manage tournaments"
  on "public"."tournaments"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Tournaments viewable by everyone"
  on "public"."tournaments"
  as permissive
  for select
  to public
using (true);



  create policy "Managers can manage venues"
  on "public"."venues"
  as permissive
  for all
  to public
using (public.is_tournament_manager(tournament_id));



  create policy "Viewable by everyone"
  on "public"."venues"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON public.manager_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON public.organizer_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON public.tournament_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Anyone can upload slips"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'slips'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Authenticated Upload"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = ANY (ARRAY['player-photos'::text, 'player-docs'::text, 'team-logos'::text, 'slips'::text])) AND (auth.role() = 'authenticated'::text)));



  create policy "Manage Own Files"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = ANY (ARRAY['player-photos'::text, 'player-docs'::text, 'team-logos'::text, 'slips'::text])) AND (auth.uid() = owner)));



  create policy "Public Access to Slips"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'slips'::text));



  create policy "Public Access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = ANY (ARRAY['player-photos'::text, 'player-docs'::text, 'team-logos'::text, 'slips'::text])));



  create policy "Public Insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'team-logos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Public Select"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'team-logos'::text));



-- 1. à¸ªà¸£à¹‰à¸²à¸‡ Storage Buckets à¸—à¸µà¹ˆà¸ˆà¸³à¹€à¸›à¹‡à¸™à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('teams', 'teams', true),
  ('team-logos', 'team-logos', true),
  ('slips', 'slips', true),
  ('player-photos', 'player-photos', true),
  ('player-docs', 'player-docs', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸² RLS (Row Level Security) à¸ªà¸³à¸«à¸£à¸±à¸š Storage Objects
-- à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸: à¹ƒà¸™à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡ Local à¹€à¸£à¸²à¸ˆà¸°à¹€à¸™à¹‰à¸™à¹ƒà¸«à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹„à¸”à¹‰à¸‡à¹ˆà¸²à¸¢ à¸ˆà¸¶à¸‡à¸­à¸™à¸¸à¸à¸²à¸•à¹ƒà¸«à¹‰ Authenticated users à¸—à¸³à¸à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”

-- à¸­à¸™à¸¸à¸à¸²à¸•à¹ƒà¸«à¹‰à¸—à¸¸à¸à¸„à¸™à¸ªà¸²à¸¡à¸²à¸£à¸–à¸­à¹ˆà¸²à¸™à¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰ (à¹€à¸žà¸£à¸²à¸°à¹€à¸›à¹‡à¸™ Public Buckets)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( true );

-- à¸­à¸™à¸¸à¸à¸²à¸•à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸—à¸µà¹ˆ Login à¹à¸¥à¹‰à¸§à¸ªà¸²à¸¡à¸²à¸£à¸–à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK ( true );

-- à¸­à¸™à¸¸à¸à¸²à¸•à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸—à¸µà¹ˆ Login à¹à¸¥à¹‰à¸§à¸ªà¸²à¸¡à¸²à¸£à¸–à¹à¸à¹‰à¹„à¸‚à¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( auth.uid() = owner );

-- à¸­à¸™à¸¸à¸à¸²à¸•à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸—à¸µà¹ˆ Login à¹à¸¥à¹‰à¸§à¸ªà¸²à¸¡à¸²à¸£à¸–à¸¥à¸šà¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( auth.uid() = owner );
-- Add sport columns for multi-sport support
ALTER TABLE tournaments ADD COLUMN sport text NOT NULL DEFAULT 'football';
ALTER TABLE teams ADD COLUMN sport text NOT NULL DEFAULT 'football';
ALTER TABLE tournament_teams ADD COLUMN sport text NOT NULL DEFAULT 'football';
ALTER TABLE global_players ADD COLUMN athlete_types text[] DEFAULT '{}';

-- Optional: Update existing records to ensure they have the default (though DEFAULT handles it)
UPDATE tournaments SET sport = 'football' WHERE sport IS NULL;
UPDATE teams SET sport = 'football' WHERE sport IS NULL;
UPDATE tournament_teams SET sport = 'football' WHERE sport IS NULL;
UPDATE global_players SET athlete_types = '{}' WHERE athlete_types IS NULL;

-- Security Trigger to prevent Role Escalation on public.profiles
CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger AS $function$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    NEW.role = OLD.role;
    NEW.is_organizer = OLD.is_organizer;
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_profile_role_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

