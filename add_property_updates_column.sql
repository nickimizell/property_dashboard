-- Add property_updates_made column to email_processing_queue table
-- This tracks how many property updates were made from each email

ALTER TABLE email_processing_queue 
ADD COLUMN IF NOT EXISTS property_updates_made INTEGER DEFAULT 0;

-- Add index for querying by property updates
CREATE INDEX IF NOT EXISTS idx_email_queue_property_updates 
ON email_processing_queue(property_updates_made);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'email_processing_queue' 
AND column_name = 'property_updates_made';

SELECT 'Property updates column added successfully' as status;