-- Add RLS policy for bot messages
CREATE POLICY "Allow bot users to send messages" ON messages
  FOR INSERT
  WITH CHECK (
    -- Allow if the user_id belongs to a bot
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = messages.user_id
      AND users.is_bot = true
    )
    -- And the message is being sent to a valid DM conversation
    AND EXISTS (
      SELECT 1 FROM dm_conversations
      WHERE dm_conversations.id = messages.conversation_id
      AND dm_conversations.is_ai_chat = true
      AND (
        dm_conversations.user1_id = messages.user_id
        OR dm_conversations.user2_id = messages.user_id
      )
    )
  ); 