import { Pinecone, createClient, OpenAI } from "./deps.js"

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

    return new Response(
      JSON.stringify({ message: "Not implemented" }),
      { headers }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}) 