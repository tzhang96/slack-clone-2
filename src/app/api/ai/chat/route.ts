import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

    // Get the bot owner's message history from both channels and DMs
    const { data: ownerMessages, error: msgError } = await supabase
      .from('messages')
      .select(`
        content,
        created_at,
        channel_id,
        conversation_id
      `)
      .eq('user_id', botUser.bot_owner_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (msgError) {
      console.error('Message fetch error:', msgError)
      return NextResponse.json({ error: 'Failed to fetch training data' }, { status: 500 })
    }

    // Create system prompt from owner's messages
    const trainingData = ownerMessages
      ?.map(m => m.content)
      .filter(Boolean)
      .join('\n') || ''

    const systemPrompt = `You are an AI trained to respond like a specific user. Here are their recent messages to learn from:\n\n${trainingData}\n\nRespond to messages in a similar style and tone. Keep responses concise and natural. If you're not sure how to respond, use a casual, friendly tone.`

    console.log('Generating AI response with prompt:', { systemPrompt, userMessage })

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150,
      temperature: 0.7,
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