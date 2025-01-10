-- Extend messages table for DMs
ALTER TABLE messages
  ALTER COLUMN channel_id DROP NOT NULL,
  ADD COLUMN conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
  ADD CONSTRAINT message_context_check CHECK (
    (channel_id IS NOT NULL AND conversation_id IS NULL) OR
    (channel_id IS NULL AND conversation_id IS NOT NULL)
  );

-- Add index for DM messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Update RLS policies for messages
DROP POLICY IF EXISTS "Users can view messages in channels" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;

-- Users can view messages in channels and their DM conversations
CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (
    CASE
      WHEN channel_id IS NOT NULL THEN true
      WHEN conversation_id IS NOT NULL THEN EXISTS (
        SELECT 1 FROM dm_conversations
        WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
      )
      ELSE false
    END
  );

-- Users can insert messages in channels and their DM conversations
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      CASE
        WHEN channel_id IS NOT NULL THEN true
        WHEN conversation_id IS NOT NULL THEN EXISTS (
          SELECT 1 FROM dm_conversations
          WHERE id = conversation_id
          AND (user1_id = auth.uid() OR user2_id = auth.uid())
        )
        ELSE false
      END
    )
  );

-- Function to update conversation's updated_at timestamp
CREATE OR REPLACE FUNCTION update_dm_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE dm_conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER update_dm_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_conversation_timestamp(); 