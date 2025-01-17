// @ts-nocheck  /* Remove this line after deploying */
import { Pinecone } from '@pinecone-database/pinecone'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

/* TypeScript types - uncomment after deploying
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    content: string
    sender_id: string
    channel_id?: string
    conversation_id?: string
    created_at: string
    [key: string]: any
  }
  schema: string
  old_record: null | Record<string, any>
}
*/

console.log('=== Starting function ===')
console.log('=== Imports loaded ===')

// Initialize clients
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const pinecone = new Pinecone({
  apiKey: Deno.env.get('PINECONE_API_KEY') ?? ''
})

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') ?? ''
})

console.log('=== Clients initialized ===')

Deno.serve(async (req) => {
  try {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    })

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers })
    }

    // Parse the request body
    const { record, type } = await req.json() as WebhookPayload
    
    // Only process insert operations
    if (type !== 'INSERT') {
      return new Response(
        JSON.stringify({ message: "Ignored non-insert operation" }),
        { headers }
      )
    }

    console.log('Processing message:', record.id)

    // Generate embedding for the message content
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: record.content,
    })

    const embedding = embeddingResponse.data[0].embedding

    // Get the index name from environment variable
    const indexName = Deno.env.get('PINECONE_INDEX_NAME') ?? 'messages'
    const index = pinecone.index(indexName)

    // Upsert the embedding to Pinecone
    await index.upsert([{
      id: record.id,
      values: embedding,
      metadata: {
        content: record.content,
        sender_id: record.sender_id,
        channel_id: record.channel_id,
        conversation_id: record.conversation_id,
        created_at: record.created_at
      }
    }])

    // Record the embedding in our database
    const { error: dbError } = await supabase
      .from('message_embeddings')
      .upsert({
        message_id: record.id
      })

    if (dbError) {
      throw new Error(`Failed to record embedding: ${dbError.message}`)
    }

    console.log('Successfully processed message:', record.id)

    return new Response(
      JSON.stringify({ 
        message: "Successfully processed message",
        id: record.id 
      }),
      { headers }
    )
  } catch (error) {
    console.error('Error processing message:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}) 