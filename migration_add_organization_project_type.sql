-- Migration: Add organization and projectType columns to users table
-- Execute this SQL script in your database to add the new columns

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization VARCHAR,
ADD COLUMN IF NOT EXISTS project_type VARCHAR;

-- Note: These columns are optional (nullable), so existing users will not be affected
