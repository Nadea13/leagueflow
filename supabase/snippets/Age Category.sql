-- Clear the table and reset identity sequence to ensure clean sorted IDs
TRUNCATE TABLE "public"."age_categories" RESTART IDENTITY CASCADE;

-- Insert age categories in order
INSERT INTO "public"."age_categories" ("id", "category_name", "min_age", "max_age")
VALUES 
    (1, 'Open', 0, 99),
    (2, 'U9', 0, 9),
    (3, 'U12', 0, 12),
    (4, 'U13', 0, 13),
    (5, 'U14', 0, 14),
    (6, 'U15', 0, 15),
    (7, 'U16', 0, 16),
    (8, 'U17', 0, 17),
    (9, 'U18', 0, 18),
    (10, 'U19', 0, 19),
    (11, 'U20', 0, 20),
    (12, 'U21', 0, 21),
    (13, 'U23', 0, 23),
    (14, 'U30', 0, 30),
    (15, 'U35', 0, 35),
    (16, 'U40', 0, 40),
    (17, 'U45', 0, 45),
    (18, 'U50', 0, 50);

-- Sync the sequence to the maximum ID
SELECT setval('public.age_categories_id_seq', (SELECT MAX(id) FROM public.age_categories));
