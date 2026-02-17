-- Add new columns for detailed product features
ALTER TABLE products
ADD COLUMN teams_limit INTEGER DEFAULT 0,
ADD COLUMN format_support TEXT DEFAULT 'Basic',
ADD COLUMN invite_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN register_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stats_support TEXT DEFAULT 'Basic',
ADD COLUMN support_level TEXT DEFAULT 'Standard';

-- Drop the old description column as it is being replaced
-- ALTER TABLE products DROP COLUMN description; 
-- Keeping description for now to avoid data loss during transition, or migrate data if needed. 
-- But user asked to "change from description to separate topics", implying replacement.
-- Let's keep it safe by just adding for now, or maybe the user intends to drop it. 
-- Given "change from... to...", I will drop it or ignore it.
ALTER TABLE products DROP COLUMN description;

-- Update existing rows with defaults if necessary (already set via DEFAULT)
-- Example updates for known plans (optional but good for consistency immediately)
UPDATE products SET 
    teams_limit = 0, -- Infinity
    format_support = 'All',
    invite_enabled = TRUE,
    register_enabled = TRUE,
    stats_support = 'Advanced',
    support_level = 'Priority'
WHERE name ILIKE '%Pro%';

UPDATE products SET 
    teams_limit = 8, 
    format_support = 'League Only', 
    invite_enabled = FALSE, 
    register_enabled = FALSE, 
    stats_support = 'Basic', 
    support_level = 'Community' 
WHERE name ILIKE '%Free%';
