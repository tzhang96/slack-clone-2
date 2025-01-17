// @ts-nocheck  /* Remove this line after deploying */
import { createClient } from '@supabase/supabase-js'

console.log('Starting cron job to sync embeddings')

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  try {
    // Verify the request is from Supabase
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      throw new Error('Missing authorization header')
    }

    // Get messages without embeddings
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select(`
        *,
        message_embeddings!left(message_id)
      `)
      .is('message_embeddings.message_id', null)
      .order('created_at', { ascending: true })
      .limit(50) // Process in batches to avoid timeouts

    if (fetchError) throw fetchError

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new messages to process" }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${messages.length} messages`)

    // Process each message
    for (const message of messages) {
      try {
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-message-embeddings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              type: 'INSERT',
              table: 'messages',
              record: message
            })
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to process message')
        }

        console.log(`Processed message ${message.id}`)
        
        // Add a small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error)
        // Continue with next message even if one fails
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully processed ${messages.length} messages`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in cron job:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}) 