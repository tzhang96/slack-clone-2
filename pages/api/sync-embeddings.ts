import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Handler started');
    console.log('Environment check:', {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      pineconeKey: !!process.env.PINECONE_API_KEY
    });

    const batchSize = parseInt(req.query.batch_size as string || '3');
    console.log('Batch size:', batchSize);

    // Get unprocessed messages
    console.log('Querying messages...');
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content')
      .not('id', 'in', (
        supabase.from('message_embedding_status')
        .select('message_id')
      ))
      .limit(batchSize);

    console.log('Query result:', { messages, error });
    if (error) throw error;
    if (!messages || messages.length === 0) {
      return res.json({ success: true, processed: 0, message: 'No messages to process' });
    }

    console.log(`Processing ${messages.length} messages`);
    const index = pinecone.index('messages-from-db');
    console.log('Pinecone index initialized');
    
    let processed = 0;
    let errors = 0;

    for (const message of messages) {
      try {
        console.log(`Creating embedding for message ${message.id}`);
        const embedding = await openai.embeddings.create({
          model: "text-embedding-3-large",
          input: message.content,
          encoding_format: "float"
        });
        console.log('Embedding created');

        console.log('Upserting to Pinecone...');
        await index.upsert([{
          id: message.id,
          values: embedding.data[0].embedding,
          metadata: {
            content: message.content
          }
        }]);
        console.log('Upserted to Pinecone');

        // Update status
        await supabase
          .from('message_embedding_status')
          .insert({
            message_id: message.id,
            status: 'completed',
            processed_at: new Date().toISOString()
          });

        processed++;
        console.log(`Processed message ${message.id}`);
      } catch (error) {
        errors++;
        console.error(`Error processing message ${message.id}:`, error);
        
        await supabase
          .from('message_embedding_status')
          .insert({
            message_id: message.id,
            status: 'error',
            error_message: String(error),
            processed_at: new Date().toISOString()
          });
      }
    }

    return res.json({
      success: true,
      processed,
      errors,
      continuation_token: messages.length === batchSize ? messages[messages.length - 1].id : undefined
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, error: String(error) });
  }
} 