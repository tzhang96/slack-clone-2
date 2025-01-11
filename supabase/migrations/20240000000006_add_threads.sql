-- Add thread support to messages table
ALTER TABLE messages
  ADD COLUMN parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  ADD COLUMN reply_count INT DEFAULT 0,
  ADD COLUMN latest_reply_at TIMESTAMP WITH TIME ZONE,
  -- Track if message is a thread parent
  ADD COLUMN is_thread_parent BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);

-- Create thread participants table
CREATE TABLE thread_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX idx_thread_participants_user_id ON thread_participants(user_id);

-- Enable RLS on thread_participants
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for thread_participants
CREATE POLICY "Users can view thread participants" ON thread_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = thread_participants.thread_id
      AND (
        -- For channel messages
        (m.channel_id IS NOT NULL)
        OR
        -- For DM messages
        (m.conversation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM dm_conversations dc
          WHERE dc.id = m.conversation_id
          AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
        ))
      )
    )
  );

CREATE POLICY "Users can insert thread participants" ON thread_participants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = thread_participants.thread_id
      AND (
        -- For channel messages
        (m.channel_id IS NOT NULL)
        OR
        -- For DM messages
        (m.conversation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM dm_conversations dc
          WHERE dc.id = m.conversation_id
          AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
        ))
      )
    )
  );

-- Function to update thread metadata
CREATE OR REPLACE FUNCTION update_thread_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_message_id IS NOT NULL THEN
      -- Update reply count and latest reply timestamp
      UPDATE messages
      SET 
        reply_count = reply_count + 1,
        latest_reply_at = NOW(),
        is_thread_parent = true
      WHERE id = NEW.parent_message_id;

      -- Add message author as thread participant if not already
      INSERT INTO thread_participants (thread_id, user_id)
      VALUES (NEW.parent_message_id, NEW.user_id)
      ON CONFLICT (thread_id, user_id) DO
      UPDATE SET last_read_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for thread metadata updates
CREATE TRIGGER update_thread_metadata_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_metadata();

-- Function to handle thread participant deletion
CREATE OR REPLACE FUNCTION cleanup_thread_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.parent_message_id IS NOT NULL THEN
    -- Decrease reply count
    UPDATE messages
    SET 
      reply_count = reply_count - 1,
      -- If this was the last reply, update is_thread_parent
      is_thread_parent = CASE 
        WHEN reply_count - 1 = 0 THEN false 
        ELSE true 
      END
    WHERE id = OLD.parent_message_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for cleaning up thread metadata
CREATE TRIGGER cleanup_thread_metadata_trigger
  BEFORE DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_thread_metadata(); 