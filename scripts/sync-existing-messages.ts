import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function syncMessages() {
  try {
    console.log('Fetching messages without embeddings...')
    
    // Get messages that don't have embeddings yet
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        message_embeddings!left (
          message_id
        )
      `)
      .is('message_embeddings.message_id', null) // Only get messages without embeddings
      .order('created_at', { ascending: true })
    
    if (error) throw error
    if (!messages) {
      console.log('No messages found')
      return
    }

    console.log(`Found ${messages.length} messages to process`)

    // Process each message
    for (const message of messages) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-message-embeddings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              type: 'INSERT',
              table: 'messages',
              record: message
            })
          }
        )

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to process message')
        }

        console.log(`Processed message ${message.id}`)
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error)
        // Continue with next message even if one fails
      }
    }

    console.log('Finished processing all messages')
  } catch (error) {
    console.error('Failed to sync messages:', error)
  }
}

// Run the sync
syncMessages() 