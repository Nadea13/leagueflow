-- Seed Sports data safely without deleting existing references
INSERT INTO "public"."sports" ("sport_name", "sport_type")
SELECT 'Football', 'team'::"public"."sport_type_enum"
WHERE NOT EXISTS (SELECT 1 FROM "public"."sports" WHERE "sport_name" = 'Football');

INSERT INTO "public"."sports" ("sport_name", "sport_type")
SELECT 'Volleyball', 'team'::"public"."sport_type_enum"
WHERE NOT EXISTS (SELECT 1 FROM "public"."sports" WHERE "sport_name" = 'Volleyball');

INSERT INTO "public"."sports" ("sport_name", "sport_type")
SELECT 'Basketball', 'team'::"public"."sport_type_enum"
WHERE NOT EXISTS (SELECT 1 FROM "public"."sports" WHERE "sport_name" = 'Basketball');
