-- Add bot user support
ALTER TABLE users 
  ADD COLUMN is_bot BOOLEAN DEFAULT false,
  ADD COLUMN bot_owner_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add AI chat support to DM conversations
ALTER TABLE dm_conversations 
  ADD COLUMN is_ai_chat BOOLEAN DEFAULT false;

-- Create index for faster bot user lookups
CREATE INDEX idx_users_bot_owner ON users(bot_owner_id) WHERE is_bot = true;

-- Modify RLS policies to allow bot owners to manage their bots
CREATE POLICY "Bot owners can update their bots" ON users
  FOR UPDATE USING (
    auth.uid() = bot_owner_id
    OR auth.uid() = id
  )
  WITH CHECK (
    auth.uid() = bot_owner_id
    OR auth.uid() = id
  );

-- Allow viewing bot ownership
CREATE POLICY "Users can view bot ownership" ON users
  FOR SELECT USING (true);

-- Function to create a bot user for a given user
CREATE OR REPLACE FUNCTION create_bot_user(owner_id UUID)
RETURNS UUID AS $$
DECLARE
  owner_record RECORD;
  bot_id UUID;
BEGIN
  -- Get owner's details
  SELECT username, full_name INTO owner_record
  FROM users
  WHERE id = owner_id;

  -- Generate bot username (append _bot to owner's username)
  -- Insert the bot user into auth.users first
  INSERT INTO auth.users (instance_id, id, aud, role, email)
  VALUES
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', owner_record.username || '_bot@ai.local')
  RETURNING id INTO bot_id;

  -- Insert into public.users
  INSERT INTO users (id, username, full_name, email, is_bot, bot_owner_id, status)
  VALUES (
    bot_id,
    owner_record.username || '_bot',
    owner_record.full_name || '''s AI',
    owner_record.username || '_bot@ai.local',
    true,
    owner_id,
    'online'
  );

  RETURN bot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 