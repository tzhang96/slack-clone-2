import { Pinecone, createClient, OpenAI } from "./deps.js"

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

Deno.serve(async (req) => {
  try {
    // Add CORS headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    })

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers })
    }

    // Get batch size from query params or default to 3
    const url = new URL(req.url)
    const batchSize = parseInt(url.searchParams.get('batch_size') || '3')
    console.log('Batch size:', batchSize)

    // Get unprocessed messages
    console.log('Querying messages...')
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content')
      .not('id', 'in', (
        supabase.from('message_embedding_status')
        .select('message_id')
      ))
      .limit(batchSize)

    console.log('Query result:', { messages, error })
    if (error) throw error
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No messages to process' }),
        { headers }
      )
    }

    console.log(`Processing ${messages.length} messages`)
    const index = pinecone.index('messages-from-db')
    console.log('Pinecone index initialized')
    
    let processed = 0
    let errors = 0

    for (const message of messages) {
      try {
        console.log(`Creating embedding for message ${message.id}`)
        const embedding = await openai.embeddings.create({
          model: "text-embedding-3-large",
          input: message.content,
          encoding_format: "float"
        })
        console.log('Embedding created')

        console.log('Upserting to Pinecone...')
        await index.upsert([{
          id: message.id,
          values: embedding.data[0].embedding,
          metadata: {
            content: message.content
          }
        }])
        console.log('Upserted to Pinecone')

        // Update status
        await supabase
          .from('message_embedding_status')
          .insert({
            message_id: message.id,
            status: 'completed',
            processed_at: new Date().toISOString()
          })

        processed++
        console.log(`Processed message ${message.id}`)
      } catch (error) {
        errors++
        console.error(`Error processing message ${message.id}:`, error)
        
        await supabase
          .from('message_embedding_status')
          .insert({
            message_id: message.id,
            status: 'error',
            error_message: String(error),
            processed_at: new Date().toISOString()
          })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        continuation_token: messages.length === batchSize ? messages[messages.length - 1].id : undefined
      }),
      { headers }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 