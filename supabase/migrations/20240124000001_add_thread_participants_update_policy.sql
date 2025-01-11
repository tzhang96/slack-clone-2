-- Add UPDATE policy for thread_participants
CREATE POLICY "Users can update their thread participant entries" ON thread_participants
  FOR UPDATE USING (
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