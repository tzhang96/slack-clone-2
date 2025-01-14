/**
 * POST /api/embed
 *
 * This endpoint queries all messages from Supabase, calls OpenAI to get embeddings,
 * and upserts to your Pinecone index "messages-from-db".
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'; // If needed, in Next.js server route fetch is typically available
import { v4 as uuidv4 } from 'uuid';

// 1. Ensure these environment variables are available
// (In your .env.local, for example)
const {
  SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  OPENAI_API_KEY,
  PINECONE_API_KEY,
  PINECONE_INDEX_NAME
} = process.env;

// 2. Create Supabase client
// Use the service role key so we can read the entire table
const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY || ''
);

// Add type definitions for OpenAI API response
interface OpenAIEmbeddingResponse {
  data: {
    embedding: number[];
    index: number;
    object: string;
  }[];
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // If you only want to allow POST to this route:
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    // 3. Fetch all messages from your Supabase table
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        user_id,
        content
      `);

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!messages || messages.length === 0) {
      return res.status(200).json({ message: 'No messages found in the table.' });
    }

    // 4. Prepare the texts for embedding
    const texts = messages.map((m) => m.content);

    // 5. Get embeddings from OpenAI
    // Use "text-embedding-ada-002" (the recommended embedding model).
    // If you specifically want "text-embedding-3-large", you'll have to confirm it exists for your account.
    const openAiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: texts
      })
    });

    if (!openAiResponse.ok) {
      throw new Error(`OpenAI API Error: ${await openAiResponse.text()}`);
    }

    const embeddingData = await openAiResponse.json() as OpenAIEmbeddingResponse;
    if (!embeddingData.data) {
      throw new Error('OpenAI embedding response is missing the data field.');
    }

    // 6. Build up the Pinecone vectors array, including metadata
    const pineconeVectors = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const embedding = embeddingData.data[i].embedding; // The embedding array

      pineconeVectors.push({
        id: m.id, // or a string unique to the message
        values: embedding,
        metadata: {
          user_id: m.user_id,
          content: m.content
        }
      });
    }

    // 7. Upsert these vectors into Pinecone
    const pineconeResponse = await fetch(
      `https://${
        PINECONE_INDEX_NAME || 'messages-from-db'
      }.svc.${process.env.PINECONE_ENVIRONMENT}-pinecone.io/vectors/upsert`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': PINECONE_API_KEY || ''
        },
        body: JSON.stringify({
          vectors: pineconeVectors,
          namespace: '' // or provide a namespace if desired
        })
      }
    );

    if (!pineconeResponse.ok) {
      throw new Error(`Pinecone API Error: ${await pineconeResponse.text()}`);
    }

    const upsertResult = await pineconeResponse.json();

    return res.status(200).json({
      message: 'Successfully embedded and upserted messages to Pinecone!',
      upsertResult
    });
  } catch (err: any) {
    console.error('Error in /api/embed:', err);
    return res.status(500).json({ error: err.message });
  }
}
