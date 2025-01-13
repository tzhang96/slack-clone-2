-- Add full-text search capabilities to messages table

-- Add search vector column
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to generate search vector
CREATE OR REPLACE FUNCTION messages_search_vector(content TEXT)
RETURNS tsvector AS $$
BEGIN
  RETURN setweight(to_tsvector('english', COALESCE(content, '')), 'A');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing messages
UPDATE messages
SET search_vector = messages_search_vector(content)
WHERE search_vector IS NULL;

-- Create trigger to keep search vector updated
CREATE OR REPLACE FUNCTION messages_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := messages_search_vector(NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS messages_search_vector_update ON messages;
CREATE TRIGGER messages_search_vector_update
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION messages_search_vector_trigger();

-- Create GIN index for efficient searching
DROP INDEX IF EXISTS messages_search_idx;
CREATE INDEX messages_search_idx ON messages USING GIN(search_vector);

-- Drop existing search function if it exists (try all variations)
DROP FUNCTION IF EXISTS search_messages(text, uuid, integer, integer);
DROP FUNCTION IF EXISTS search_messages(text, uuid);
DROP FUNCTION IF EXISTS search_messages(text);

-- Create search function
CREATE FUNCTION search_messages(
  search_query text,
  searching_user_id uuid,
  limit_val integer DEFAULT 10,
  offset_val integer DEFAULT 0
) RETURNS TABLE (
  id uuid,
  channel_id uuid,
  conversation_id uuid,
  user_id uuid,
  content text,
  created_at timestamptz,
  parent_message_id uuid,
  is_thread_parent boolean,
  reply_count integer,
  ts_rank float4,
  context_name text,
  context_type text,
  channel_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.channel_id,
    m.conversation_id,
    m.user_id,
    m.content,
    m.created_at,
    m.parent_message_id,
    m.is_thread_parent,
    m.reply_count,
    ts_rank(m.search_vector, websearch_to_tsquery('english', search_query)) as ts_rank,
    CASE 
      WHEN m.parent_message_id IS NOT NULL THEN 
        (SELECT pm.content FROM messages pm WHERE pm.id = m.parent_message_id)::TEXT
      WHEN m.channel_id IS NOT NULL THEN 
        c.name::TEXT
      ELSE 
        (SELECT string_agg(p.username, ', ') 
         FROM dm_conversations dc
         JOIN users p ON p.id IN (dc.user1_id, dc.user2_id)
         WHERE dc.id = m.conversation_id
         AND p.id != searching_user_id)::TEXT
    END as context_name,
    CASE 
      WHEN m.parent_message_id IS NOT NULL THEN 'thread'::TEXT
      WHEN m.channel_id IS NOT NULL THEN 'channel'::TEXT
      ELSE 'dm'::TEXT
    END as context_type,
    c.name::TEXT as channel_name
  FROM messages m
  LEFT JOIN channels c ON m.channel_id = c.id
  WHERE 
    m.search_vector @@ websearch_to_tsquery('english', search_query)
    AND (
      -- All users can see channel messages
      m.channel_id IS NOT NULL
      -- User can see DM messages if they are a participant
      OR (m.conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM dm_conversations dc
        WHERE dc.id = m.conversation_id 
        AND (dc.user1_id = searching_user_id OR dc.user2_id = searching_user_id)
      ))
    )
  ORDER BY ts_rank DESC, m.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 