import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
})

interface User {
  id: string
  full_name: string
  is_bot: boolean
  bot_owner_id: string | null
}

interface Conversation {
  is_ai_chat: boolean
  user1_id: string
  user2_id: string
  user1: User
  user2: User
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { conversationId, userMessage } = await request.json()
    if (!conversationId || !userMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get conversation details to verify it's an AI chat
    const { data: conversation, error: convError } = await supabase
      .from('dm_conversations')
      .select(`
        is_ai_chat,
        user1_id,
        user2_id,
        user1:users!dm_conversations_user1_id_fkey (
          id,
          full_name,
          is_bot,
          bot_owner_id
        ),
        user2:users!dm_conversations_user2_id_fkey (
          id,
          full_name,
          is_bot,
          bot_owner_id
        )
      `)
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('Conversation error:', convError)
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const typedConversation = conversation as unknown as Conversation
    if (!typedConversation.is_ai_chat) {
      return NextResponse.json({ error: 'Not an AI chat' }, { status: 400 })
    }

    // Find the bot user from both user1 and user2
    const botUser = [typedConversation.user1, typedConversation.user2].find(u => u.is_bot)

    if (!botUser) {
      console.error('Bot user not found in conversation:', typedConversation)
      return NextResponse.json({ error: 'Bot user not found' }, { status: 404 })
    }

    // Create embedding for user's message to find relevant context
    const messageEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: userMessage,
      encoding_format: "float"
    })

    // Query Pinecone for similar messages from the bot owner
    const index = pinecone.Index("messages-from-db")
    const searchResponse = await index.query({
      vector: messageEmbedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
      filter: {
        user_id: { $eq: botUser.bot_owner_id }
      }
    })

    // Extract relevant messages for context
    const relevantMessages = searchResponse.matches
      .map(match => match.metadata?.content)
      .filter(Boolean)
      .join('\n')

    // Create system prompt with relevant context
    const systemPrompt = `You are an AI trained to respond like a specific user. Here are some of their relevant messages that match the context of the current conversation:

${relevantMessages}

Analyze and imitate their:
1. Capitalization style (do they use caps for emphasis? lowercase everything?)
2. Punctuation habits (multiple exclamation marks? ellipsis? emoji usage?)
3. Common phrases or expressions they repeat
4. Sentence structure (short and choppy? long and flowing?)
5. Slang or abbreviations they frequently use
6. Any unique typing quirks (typos, specific letter replacements, etc.)

Respond to messages in their exact style, tone, and typing patterns. Use the information in the provided messages. Keep responses concise and natural.`

    console.log('Generating AI response with prompt:', { systemPrompt, userMessage })

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150,
      temperature: 0.9,
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      console.error('No AI response generated')
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
    }

    console.log('AI response generated:', aiResponse)

    // Send AI response as a message from the bot user
    const { error: sendError } = await supabase
      .from('messages')
      .insert({
        content: aiResponse,
        user_id: botUser.id,
        conversation_id: conversationId,
        channel_id: null,
        parent_message_id: null
      })

    if (sendError) {
      console.error('Error sending AI message:', sendError)
      return NextResponse.json({ error: 'Failed to send AI response' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 