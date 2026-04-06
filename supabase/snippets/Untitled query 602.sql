-- สร้าง buckets ถ้ายังไม่มี
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('teams', 'teams', true),
  ('team-logos', 'team-logos', true),
  ('slips', 'slips', true),
  ('player-photos', 'player-photos', true),
  ('player-docs', 'player-docs', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
