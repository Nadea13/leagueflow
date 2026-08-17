-- Alter master_players to add favorite_sport_id, preferred_hand, and preferred_foot
ALTER TABLE "public"."master_players"
ADD COLUMN IF NOT EXISTS "favorite_sport_id" uuid REFERENCES "public"."sports"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "preferred_hand" character varying(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "preferred_foot" character varying(20) DEFAULT NULL;
