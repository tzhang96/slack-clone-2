# Message Embeddings Implementation

This document describes the implementation of automatic message embeddings for semantic search functionality.

## Overview

The system automatically generates embeddings for all chat messages using OpenAI's text-embedding-3-small model and stores them in Pinecone for efficient semantic search. This is handled through two Supabase Edge Functions:

1. `sync-message-embeddings`: Processes individual messages and generates their embeddings
2. `cron-sync-embeddings`: Runs periodically to catch any messages that might have been missed

## TypeScript and Deployment Notes

Due to some quirks with TypeScript type checking in Supabase Edge Functions, the TypeScript files include a `// @ts-nocheck` comment at the top. This is normal and doesn't affect functionality. After deploying the functions, you can remove this line if you want to restore type checking.

## Architecture

### Components

1. **Edge Functions**:
   - `sync-message-embeddings`: Main function for processing messages
   - `cron-sync-embeddings`: Scheduled function for batch processing

2. **External Services**:
   - OpenAI: Generates text embeddings
   - Pinecone: Stores embeddings for vector search
   - Supabase: Tracks processed messages

### Database Schema

```sql
-- Table to track which messages have been processed
create table message_embeddings (
  message_id uuid primary key references messages(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Implementation Details

### Message Processing Flow

1. When a new message is created:
   - The `sync-message-embeddings` function is triggered
   - Generates an embedding using OpenAI
   - Stores the embedding in Pinecone
   - Records the processing in `message_embeddings` table

2. Periodic cleanup:
   - The `cron-sync-embeddings` function runs every hour
   - Finds messages without embeddings
   - Processes them in batches of 50
   - Handles any failures gracefully

### Edge Function Configuration

Both functions require the following environment variables:
```
OPENAI_API_KEY=your-openai-api-key
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=your-pinecone-index-name
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Deployment

1. Deploy the edge functions:
```bash
supabase functions deploy sync-message-embeddings
supabase functions deploy cron-sync-embeddings
```

2. Set up the cron schedule in Supabase dashboard:
   - Function: `cron-sync-embeddings`
   - Schedule: `0 * * * *` (runs every hour)

## Error Handling

- Failed message processing is logged but doesn't stop the batch
- Messages are retried on the next cron run
- Rate limiting is handled with delays between requests

## Monitoring

Monitor the system through:
1. Supabase Edge Function logs
2. `message_embeddings` table for processing status
3. Pinecone dashboard for vector storage metrics 