-- Check if profiles table exists and add missing relationships if needed
-- This query will ensure proper relationships between budgets and profiles

-- First, let's check if we need to create any foreign key relationships
-- between budgets and profiles for the budget alert system to work properly

-- Add foreign key constraint to budgets table to reference profiles
DO $$
BEGIN
    -- Check if the constraint doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'budgets' 
        AND constraint_name = 'budgets_user_id_fkey'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Add foreign key constraint if profiles table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            ALTER TABLE budgets 
            ADD CONSTRAINT budgets_user_id_profiles_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES profiles(user_id) 
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Ensure profiles table has proper indexes for performance
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON budgets(user_id);

-- Ensure import_jobs has proper relationship and indexes
CREATE INDEX IF NOT EXISTS import_jobs_user_id_idx ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS import_jobs_status_idx ON import_jobs(status);