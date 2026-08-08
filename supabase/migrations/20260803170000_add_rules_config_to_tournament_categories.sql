-- Migration to add rules_config (JSONB) to tournament_categories
-- This column stores sport-specific rules/details (e.g. points per set, max sets, tie-break rules, etc.)

ALTER TABLE "public"."tournament_categories" 
ADD COLUMN IF NOT EXISTS "rules_config" jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN "public"."tournament_categories"."rules_config" IS 'Additional sport-specific configuration & rules for this category (e.g. set_points, max_sets, tie_breaker)';
