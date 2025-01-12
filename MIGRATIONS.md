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

2. `20240000000002_add_reactions.sql`
   - Adds emoji reaction functionality to messages
   - Creates reactions table with emoji and user references
   - Adds RLS policies for secure access
   - **Key Features:**
     1. Unique constraint preventing duplicate reactions
     2. Cascading deletes when messages are removed
     3. RLS policies ensuring proper access control

3. `20240000000003_add_files.sql`
   - Adds file attachment support for messages
   - Creates files table with metadata and storage references
   - **Key Features:**
     1. Support for various file types (images, documents)
     2. Metadata tracking (size, dimensions for images)
     3. Secure access through RLS policies
     4. Automatic cleanup through cascading deletes

4. `20240000000004_add_dm_conversations.sql`
   - Adds direct messaging conversation functionality
   - Creates dm_conversations table with user1_id and user2_id
   - Ensures unique conversations between pairs of users
   - **Key Features:**
     1. Unique constraint using least/greatest to prevent duplicate conversations
     2. Index for efficient conversation lookup
     3. RLS policies ensuring users can only access their own conversations

5. `20240000000005_add_dm_messages.sql`
   - Adds support for direct messages between users
   - Extends messages table with conversation_id
   - **Key Features:**
     1. Foreign key relationship to dm_conversations
     2. RLS policies for secure message access
     3. Indexes for efficient message retrieval

6. `20240000000006_add_threads.sql`
   - Adds threaded conversation support
   - Extends messages table with thread-related columns
   - Creates thread_participants table for tracking engagement
   - **Key Features:**
     1. Parent-child relationship between messages
     2. Automatic thread metadata updates (reply count, latest reply)
     3. Thread participant tracking with last read timestamps
     4. Triggers for maintaining thread statistics
     5. RLS policies ensuring proper access control

7. `20240124000000_update_thread_participants_policy.sql` and `20240124000001_add_thread_participants_update_policy.sql`
   - Enhances thread participant security policies
   - Adds UPDATE policy for thread participants
   - **Key Features:**
     1. Allows users to update their own thread participant entries
     2. Maintains security for both channel and DM threads
     3. Ensures proper access control through RLS

### Manual Steps for Thread Support

1. **Verify Trigger Functions**
   ```sql
   -- Check if triggers are properly installed
   SELECT * FROM pg_trigger WHERE tgname LIKE '%thread%';
   ```

2. **Monitor Thread Statistics**
   ```sql
   -- Check thread statistics
   SELECT id, reply_count, latest_reply_at, is_thread_parent
   FROM messages
   WHERE is_thread_parent = true;
   ```

3. **Verify Thread Participant Access**
   ```sql
   -- Test thread participant policies
   SELECT * FROM thread_participants
   WHERE user_id = auth.uid();
   ``` 

### 20240125000000_add_channel_deletion_procedure.sql

Adds a stored procedure for safely deleting channels and all associated data. Key features:

- Safely handles deletion of channels with threaded messages
- Clears thread relationships before deletion to prevent foreign key violations
- Cascades deletion to all related data:
  - Messages in the channel
  - Reactions on those messages
  - Files attached to messages
  - Thread participants
- Handles storage file cleanup gracefully:
  - Database records are deleted immediately
  - Storage files are marked for cleanup
  - Actual storage deletion happens asynchronously

**Manual Verification:**
1. Create a channel with some messages, including:
   - Regular messages
   - Threaded messages with replies
   - Messages with file attachments
2. Delete the channel
3. Verify that:
   - Channel and all messages are deleted
   - No orphaned reactions or files remain
   - No foreign key violations occur
   - Thread relationships are cleaned up properly

**Note:** Storage file cleanup requires the `net` extension and proper configuration of `app.storage_url` and `app.storage_key`. If these are not available, file records will be deleted from the database but storage cleanup will be deferred. 