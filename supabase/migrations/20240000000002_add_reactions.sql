-- Create reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (LENGTH(emoji) <= 32), -- Limit emoji length for safety
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure a user can't react with the same emoji twice on the same message
    UNIQUE(message_id, user_id, emoji)
);

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reactions_message_id') THEN
        CREATE INDEX idx_reactions_message_id ON reactions(message_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reactions_user_id') THEN
        CREATE INDEX idx_reactions_user_id ON reactions(user_id);
    END IF;
END$$;

-- Enable Row Level Security
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all reactions" ON reactions;
DROP POLICY IF EXISTS "Users can add their own reactions" ON reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON reactions;

-- Create policies
CREATE POLICY "Users can view all reactions" ON reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can add their own reactions" ON reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
DO $$
BEGIN
  -- Create publication if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Add table to publication if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
  END IF;
END$$; 