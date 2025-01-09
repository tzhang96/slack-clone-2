# Database Migrations

## Overview

This project uses a combination of a base schema file (`schema.sql`) and incremental migration files to manage database changes. This approach provides version control, rollback capabilities, and safe production updates.

## File Structure

```
supabase/
├── schema.sql              # Base schema with core tables and policies
└── migrations/            # Incremental changes
    ├── YYYYMMDDHHMMSS_*.sql  # Timestamp-prefixed migration files
```

## Migration Strategy

### Base Schema (`schema.sql`)
- Contains the foundational database structure
- Defines core tables, indexes, and security policies
- Includes essential data validation rules
- Should be used for initial database setup only

### Migration Files
- Located in `supabase/migrations/`
- Named with timestamp prefix for ordering (e.g., `20240000000001_add_heartbeat.sql`)
- Each file represents a single, atomic change to the database
- Must be idempotent (safe to run multiple times)
- Should include cleanup of existing objects when necessary

## Supabase-Specific Considerations

### Extensions
Some features require Supabase extensions to be enabled manually:
1. Go to your Supabase dashboard
2. Navigate to Database > Extensions
3. Find and enable required extensions (e.g., `pg_cron` for scheduled tasks)

### Scheduled Functions
Supabase requires functions to be created and scheduled separately:

1. **Enable Required Extension**
   - Go to Database > Extensions
   - Search for "pg_cron"
   - Click the toggle to enable it
   - Wait a few seconds for the extension to be enabled

2. **Create and Grant Permissions**
   - The migration will:
     - Create the function
     - Grant necessary permissions to postgres role
     - Add required columns to the users table

3. **Schedule the Function**
   - Go to the SQL Editor
   - Run the following SQL:
     ```sql
     SELECT cron.schedule(
       'mark-inactive-users',  -- name of the cron job
       '*/20 * * * * *',      -- every 20 seconds
       $$SELECT mark_inactive_users_offline()$$
     );
     ```

4. **Verify the Setup**
   - Test the function manually:
     ```sql
     SELECT mark_inactive_users_offline();
     ```
   - Check if the job is scheduled:
     ```sql
     SELECT * FROM cron.job WHERE jobname = 'mark-inactive-users';
     ```
   - Monitor the job logs:
     ```sql
     SELECT * FROM cron.job_run_details 
     WHERE jobid = (
       SELECT jobid FROM cron.job 
       WHERE jobname = 'mark-inactive-users'
     )
     ORDER BY runid DESC
     LIMIT 5;
     ```

5. **Troubleshooting**
   - If you accidentally schedule twice:
     ```sql
     SELECT cron.unschedule('mark-inactive-users');
     ```
   - To check affected rows:
     ```sql
     SELECT id, status, last_heartbeat, 
            NOW() - last_heartbeat as time_since_heartbeat
     FROM users 
     WHERE status != 'offline' 
     AND last_heartbeat < NOW() - INTERVAL '45 seconds';
     ```

## Best Practices

1. **Atomic Changes**
   - Each migration should represent one logical change
   - Keep migrations focused and independent
   - Include both the change and any necessary cleanup

2. **Safety Measures**
   - Use `IF NOT EXISTS` when creating new objects
   - Use `OR REPLACE` for functions and views
   - Clean up existing objects before recreation
   - Include proper error handling

3. **Backwards Compatibility**
   - Ensure migrations don't break existing functionality
   - Consider data migration when changing column types
   - Add new columns as nullable or with defaults

4. **Documentation**
   - Include clear comments explaining the purpose of each migration
   - Document any manual steps required
   - Note any dependencies on other migrations

## Example Migration

```sql
-- Enable required extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Clean up existing objects
SELECT cron.unschedule('job-name');

-- Add new column safely
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name data_type DEFAULT default_value;

-- Create or replace function
CREATE OR REPLACE FUNCTION function_name()
RETURNS void AS $$
BEGIN
  -- Function logic
END;
$$ LANGUAGE plpgsql;
```

## Applying Migrations

1. Initial Setup:
   - Run `schema.sql` to create the base database structure
   - Apply any existing migrations in timestamp order
   - Enable required extensions in Supabase dashboard
   - Set up scheduled functions if needed

2. New Changes:
   - Create a new migration file with current timestamp prefix
   - Test the migration in development
   - Document any manual steps required
   - Apply to production after testing

3. Rollback:
   - Each migration should have a corresponding rollback plan
   - Document rollback steps in migration comments
   - Test rollback procedures in development
   - Include cleanup of any manual configurations

## Current Migrations

1. `20240000000001_add_heartbeat.sql`
   - Adds user presence/heartbeat functionality
   - Creates function for marking inactive users
   - Adds last_heartbeat column to users table
   - **Manual Steps Required:**
     1. Enable `pg_cron` extension in Supabase dashboard
     2. Create scheduled function `mark-inactive-users` to run every 20 seconds 