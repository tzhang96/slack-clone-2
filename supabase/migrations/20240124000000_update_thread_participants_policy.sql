-- Add UPDATE policy for messages to allow thread metadata updates
CREATE POLICY "Users can update thread metadata" ON messages
  FOR UPDATE USING (
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