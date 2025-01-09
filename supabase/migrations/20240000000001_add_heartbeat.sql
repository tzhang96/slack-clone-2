-- Note: pg_cron extension must be enabled in your Supabase project settings first
-- You can enable it in the Database > Extensions section of your Supabase dashboard

-- Add last_heartbeat column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_heartbeat timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

-- Create or replace function to mark inactive users as offline
CREATE OR REPLACE FUNCTION mark_inactive_users_offline()
RETURNS void AS $$
DECLARE
    affected_rows integer;
BEGIN
    UPDATE users
    SET status = 'offline',
        last_seen = last_heartbeat
    WHERE 
        status != 'offline' 
        AND last_heartbeat < NOW() - INTERVAL '45 seconds';
        
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Marked % users as offline at %', affected_rows, NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT UPDATE ON users TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT EXECUTE ON FUNCTION mark_inactive_users_offline TO postgres;

-- Note: After running this migration, you need to schedule the function in Supabase:
-- 1. Go to the SQL Editor
-- 2. Run this command:
--    SELECT cron.schedule(
--      'mark-inactive-users',  -- name of the cron job
--      '*/20 * * * * *',      -- every 20 seconds
--      $$SELECT mark_inactive_users_offline()$$
--    ); 