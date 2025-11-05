-- Add demolition fields to Building table
ALTER TABLE Building ADD COLUMN isDemolishing BOOLEAN DEFAULT 0;
ALTER TABLE Building ADD COLUMN demolitionAt DATETIME;
ALTER TABLE Building ADD COLUMN demolitionMode TEXT;
ALTER TABLE Building ADD COLUMN demolitionCost INTEGER DEFAULT 0;
