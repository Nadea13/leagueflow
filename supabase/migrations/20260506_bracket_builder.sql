-- Bracket Builder: Store React Flow canvas state on the tournament
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS canvas_data jsonb;

-- Link each match to its React Flow node
ALTER TABLE matches ADD COLUMN IF NOT EXISTS node_id text;

-- Placeholder labels for bracket display ("Winner of Match #3", "Team A")
ALTER TABLE matches ADD COLUMN IF NOT EXISTS placeholder_a text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS placeholder_b text;

-- Which node does the winner flow into?
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_to_node_id text;
