-- Create reactions table
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (LENGTH(emoji) <= 32), -- Limit emoji length for safety
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure a user can't react with the same emoji twice on the same message
    UNIQUE(message_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX idx_reactions_message_id ON reactions(message_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);

-- Enable Row Level Security
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow all authenticated users to view reactions
CREATE POLICY "Users can view all reactions" ON reactions
    FOR SELECT USING (true);

-- Allow users to add their own reactions
CREATE POLICY "Users can add their own reactions" ON reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reactions
CREATE POLICY "Users can delete their own reactions" ON reactions
    FOR DELETE USING (auth.uid() = user_id); 