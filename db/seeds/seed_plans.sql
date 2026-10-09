-- LeagueFlow Seed Products
-- Idempotent Version

-- 1. Cleanup existing (Optional)
-- DELETE FROM public.products;

-- 2. Insert Plans
INSERT INTO public.plans (name, description, price, discounted_price, duration, teams_limit, format_support, invite_enabled, register_enabled, stats_support, support_level, recommended, target_role)
VALUES 
('Starter', ARRAY['Up to 8 teams', 'League & Knockout', 'Basic Statistics', 'Community Support'], 0, NULL, 'lifetime', 8, 'Basic', FALSE, FALSE, 'Basic', 'Community', FALSE, 'organizer'),
('Per Tournament', ARRAY['Unlimited teams', 'All tournament formats', 'Advanced Stats & Goals', 'Standard Support', 'Custom Branding'], 990, 590, 'lifetime', 0, 'All', TRUE, TRUE, 'Advanced', 'Standard', TRUE, 'organizer'),
('Monthly Pro', ARRAY['Unlimited tournaments', 'All pro features included', 'Priority 24/7 Support', 'Cancel anytime'], 1290, 890, 'monthly', 0, 'All', TRUE, TRUE, 'Advanced', 'Priority', FALSE, 'organizer'),
('Yearly Pro', ARRAY['Save 2 months', 'Unlimited everything', 'VIP Priority Support', 'Advance Analytics'], 12900, 8900, 'yearly', 0, 'All', TRUE, TRUE, 'Advanced', 'Priority', FALSE, 'organizer'),
('Manager Starter', ARRAY['1 Team limit', 'Basic Player Management', 'Community Support'], 0, NULL, 'lifetime', 1, '14', FALSE, FALSE, 'Basic', 'Community', FALSE, 'manager'),
('Manager Pro', ARRAY['Professional Team Management', 'Full Player Statistics', 'E-Certificates for Players', 'Premium Support'], 490, 290, 'monthly', 0, 'All', FALSE, FALSE, 'Advanced', 'Standard', FALSE, 'manager')
ON CONFLICT (name) DO NOTHING;
