-- Enable PostgreSQL trigram extension for fuzzy text matching
-- This is required for the similarity() function used in property matching

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Test the extension
SELECT 'Extension enabled successfully' as status;