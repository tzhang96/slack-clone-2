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

-- Drop existing search function if it exists
DROP FUNCTION IF EXISTS search_messages(text, uuid, integer, integer);

-- Create search function
CREATE FUNCTION search_messages(
  search_query TEXT,
  channel_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  channel_id UUID,
  conversation_id UUID,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  context_name TEXT,
  context_type TEXT,
  ts_rank FLOAT4
) AS $$
BEGIN
  IF trim(search_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH message_contexts AS (
    SELECT
      m.id,
      m.channel_id,
      m.conversation_id,
      m.user_id,
      m.content::TEXT,
      m.created_at,
      CASE
        WHEN m.channel_id IS NOT NULL THEN c.name::TEXT
        WHEN m.conversation_id IS NOT NULL THEN 
          CONCAT(u1.username::TEXT, ', ', u2.username::TEXT)
      END as context_name,
      CASE
        WHEN m.channel_id IS NOT NULL THEN 'channel'::TEXT
        WHEN m.conversation_id IS NOT NULL THEN 'dm'::TEXT
      END as context_type,
      ts_rank(m.search_vector, plainto_tsquery('english', search_query)) as ts_rank
    FROM messages m
    LEFT JOIN channels c ON m.channel_id = c.id
    LEFT JOIN dm_conversations dc ON m.conversation_id = dc.id
    LEFT JOIN users u1 ON dc.user1_id = u1.id
    LEFT JOIN users u2 ON dc.user2_id = u2.id
    WHERE
      m.search_vector @@ plainto_tsquery('english', search_query)
      AND (channel_id_param IS NULL OR m.channel_id = channel_id_param)
  )
  SELECT *
  FROM message_contexts
  ORDER BY ts_rank DESC, created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 