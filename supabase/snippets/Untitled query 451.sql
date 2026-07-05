-- 1. Alter master_players to add Thai and English names
ALTER TABLE "public"."master_players" 
ADD COLUMN IF NOT EXISTS "middle_name" character varying(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "first_name_th" character varying(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "middle_name_th" character varying(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "last_name_th" character varying(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "first_name_en" character varying(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "middle_name_en" character varying(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "last_name_en" character varying(255) DEFAULT NULL;

-- Copy existing data to English columns if the old columns exist
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_players' AND column_name='first_name') THEN
        UPDATE "public"."master_players"
        SET 
            "first_name_en" = COALESCE("first_name_en", "first_name"),
            "last_name_en" = COALESCE("last_name_en", "last_name"),
            "middle_name_en" = COALESCE("middle_name_en", "middle_name");

        -- Drop old columns
        ALTER TABLE "public"."master_players"
        DROP COLUMN IF EXISTS "first_name",
        DROP COLUMN IF EXISTS "last_name",
        DROP COLUMN IF EXISTS "middle_name";
    END IF;
END $$;

-- Create enum type for payment status
DO $$ BEGIN
    CREATE TYPE "public"."payment_status" AS ENUM ('pending', 'success', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create payments table
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
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "payments_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE SET NULL,
    CONSTRAINT "payments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."payments" OWNER TO "postgres";

-- Enable Row Level Security (RLS)
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

-- Set up Policies for payments
DROP POLICY IF EXISTS "payments_select" ON "public"."payments";
CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT TO "authenticated" 
USING ((("auth"."uid"() = "user_id") OR ((SELECT "users"."role" FROM "public"."users" WHERE "users"."id" = "auth"."uid"()) = 'admin')));

DROP POLICY IF EXISTS "payments_write" ON "public"."payments";
CREATE POLICY "payments_write" ON "public"."payments" TO "authenticated" 
USING (((SELECT "users"."role" FROM "public"."users" WHERE "users"."id" = "auth"."uid"()) = 'admin'));

-- Add trigger for updated_at column
DROP TRIGGER IF EXISTS "set_timestamp_payments" ON "public"."payments";
CREATE TRIGGER "set_timestamp_payments" BEFORE UPDATE ON "public"."payments" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Grants
GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";