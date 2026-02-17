-- Add recommended column to products table
ALTER TABLE products
ADD COLUMN recommended BOOLEAN DEFAULT FALSE;

-- Update existing rows (optional, setting one as default recommended for now if needed, e.g. Monthly Pro)
UPDATE products SET recommended = TRUE WHERE name ILIKE '%Monthly Pro%';
