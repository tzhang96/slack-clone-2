-- Function to safely delete a channel and its messages
CREATE OR REPLACE FUNCTION delete_channel_with_messages(channel_id_param UUID)
RETURNS void AS $$
BEGIN
    -- First verify the channel exists
    IF NOT EXISTS (SELECT 1 FROM channels WHERE id = channel_id_param) THEN
        RAISE EXCEPTION 'Channel not found';
    END IF;

    -- First, clear thread relationships to avoid trigger issues
    UPDATE messages 
    SET parent_message_id = NULL,
        is_thread_parent = false,
        reply_count = 0
    WHERE channel_id = channel_id_param;

    -- Now we can safely delete the channel and let CASCADE handle the rest
    -- This will automatically delete:
    -- 1. All messages in the channel (via messages.channel_id CASCADE)
    -- 2. All reactions on those messages (via reactions.message_id CASCADE)
    -- 3. All files attached to those messages (via files.message_id CASCADE)
    -- 4. All thread participants (via thread_participants.thread_id CASCADE)
    DELETE FROM channels WHERE id = channel_id_param;

    -- Note: Storage files will need to be cleaned up by a separate scheduled job
    -- This is safer than trying to delete them inline
END;
$$ LANGUAGE plpgsql; 