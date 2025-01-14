console.log('=== Starting function ===');

import { Pinecone } from '@pinecone-database/pinecone'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

console.log('=== Imports loaded ===');

// Initialize clients
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const pinecone = new Pinecone({
  apiKey: Deno.env.get('PINECONE_API_KEY')!
})

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!
})

console.log('=== Clients initialized ===');

// Add type for response
interface SyncResponse {
  success: boolean;
  processed: number;
  errors: number;
  continuation_token?: string;
}

const handler = async (req: Request) => {
  console.log('=== Handler called ===');
  // ... rest of the handler code ...
}

console.log('=== Setting up server ===');
Deno.serve(handler);
console.log('=== Server ready ==='); 