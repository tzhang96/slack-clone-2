import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Message, SupabaseMessage } from '@/types/chat'

// Helper function to transform Supabase message to our Message type
const transformMessage = (msg: SupabaseMessage): Message => {
  const userInfo = Array.isArray(msg.users) ? msg.users[0] : msg.users
  return {
    id: msg.id,
    content: msg.content,
    createdAt: msg.created_at,
    user: {
      id: msg.user_id,
      username: userInfo.username,
      fullName: userInfo.full_name
    }
  }
}

export function useMessages(channelId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()

  console.log('useMessages hook - channelId:', channelId)

  // Subscribe to real-time message changes
  useEffect(() => {
    if (!channelId) return

    const messageSubscription = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          console.log('Message change received:', payload)

          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as SupabaseMessage
            // Only add the message if we don't already have it
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) {
                return prev
              }

              // Get user info from the message sender's optimistic update
              const existingMsg = prev.find(m => 
                m.id.startsWith('temp-') && m.user.id === newMsg.user_id
              )

              return [...prev.filter(m => m.id !== existingMsg?.id), {
                id: newMsg.id,
                content: newMsg.content,
                createdAt: newMsg.created_at,
                user: existingMsg?.user || {
                  id: newMsg.user_id,
                  username: 'user',
                  fullName: 'Anonymous'
                }
              }]
            })
          }
        }
      )
      .subscribe()

    return () => {
      console.log('Unsubscribing from message changes')
      messageSubscription.unsubscribe()
    }
  }, [channelId])

  const sendMessage = async (content: string) => {
    console.log('sendMessage called with:', content)
    if (!user || !channelId) return

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        fullName: user.user_metadata?.full_name || 'Anonymous'
      }
    }

    // Add optimistic message to state
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: channelId,
          user_id: user.id
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          users (
            id,
            username,
            full_name
          )
        `)
        .single()

      if (error) throw error

      const supaMessage = data as SupabaseMessage
      const userInfo = Array.isArray(supaMessage.users) ? supaMessage.users[0] : supaMessage.users

      // Replace optimistic message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id
            ? {
                id: supaMessage.id,
                content: supaMessage.content,
                createdAt: supaMessage.created_at,
                user: {
                  id: supaMessage.user_id,
                  username: userInfo.username,
                  fullName: userInfo.full_name
                }
              }
            : msg
        )
      )
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setError(error as Error)
    }
  }

  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          users!messages_user_id_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error

      setMessages((data as SupabaseMessage[]).map(msg => {
        const userInfo = Array.isArray(msg.users) ? msg.users[0] : msg.users
        return {
          id: msg.id,
          content: msg.content,
          createdAt: msg.created_at,
          user: {
            id: msg.user_id,
            username: userInfo.username,
            fullName: userInfo.full_name
          }
        }
      }))
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [channelId])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    fetchMessages
  }
} 