import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Message } from '@/types/chat'
import { useAuth } from '@/lib/auth'

interface FileMetadata {
  bucket_path: string
  file_name: string
  file_size: number
  content_type: string
  is_image: boolean
  image_width?: number
  image_height?: number
}

// Helper function to transform Supabase message data to our Message type
const transformMessage = (msg: any): Message => {
  console.log('Transforming message data:', msg)
  if (!msg.user) {
    console.warn('Missing user data for message:', msg)
  }

  // Transform the file data if it exists
  const file = msg.files?.[0] ? {
    id: msg.files[0].id,
    message_id: msg.files[0].message_id,
    user_id: msg.files[0].user_id,
    bucket_path: msg.files[0].bucket_path,
    file_name: msg.files[0].file_name,
    file_size: msg.files[0].file_size,
    content_type: msg.files[0].content_type,
    is_image: msg.files[0].is_image,
    image_width: msg.files[0].image_width,
    image_height: msg.files[0].image_height,
    created_at: msg.files[0].created_at
  } : undefined

  const transformed = {
    id: msg.id,
    content: msg.content,
    createdAt: msg.created_at,
    channelId: null,  // This is a DM message, so channelId should be null
    conversationId: msg.conversation_id,  // Keep track of the conversation ID
    user: {
      id: msg.user_id,
      fullName: msg.user?.full_name || 'Unknown User',
      username: msg.user?.username || 'unknown',
      lastSeen: msg.user?.last_seen
    },
    file
  }
  console.log('Transformed message:', transformed)
  return transformed
}

export function useDMMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const MESSAGES_PER_PAGE = 50

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log('Starting fetchMessages for conversation:', conversationId)
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            conversation_id,
            user_id,
            user:users!messages_user_id_fkey (
              id,
              username,
              full_name,
              last_seen
            ),
            files (
              id,
              message_id,
              user_id,
              bucket_path,
              file_name,
              file_size,
              content_type,
              is_image,
              image_width,
              image_height,
              created_at
            )
          `)
          .eq('conversation_id', conversationId)
          .is('channel_id', null)
          .order('created_at', { ascending: false })
          .limit(MESSAGES_PER_PAGE)

        console.log('Raw query result:', { data, error })

        if (error) {
          console.error('Supabase query error:', error)
          throw error
        }

        if (!data) {
          console.log('No data returned from query')
          setMessages([])
          return
        }

        console.log('Processing messages data:', data)
        const transformedMessages = data.reverse().map(msg => {
          console.log('Processing message:', msg)
          const transformed = transformMessage(msg)
          console.log('Transformed message:', transformed)
          return transformed
        })
        
        console.log('Final transformed messages:', transformedMessages)
        setMessages(transformedMessages)
        setHasMore(data.length === MESSAGES_PER_PAGE)
      } catch (error) {
        console.error('Error in fetchMessages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        console.log('Received new message:', payload)
        // Fetch the complete message data with user info
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            conversation_id,
            user_id,
            user:users!messages_user_id_fkey (
              id,
              username,
              full_name,
              last_seen
            ),
            files (
              id,
              message_id,
              user_id,
              bucket_path,
              file_name,
              file_size,
              content_type,
              is_image,
              image_width,
              image_height,
              created_at
            )
          `)
          .eq('id', payload.new.id)
          .single()

        console.log('Fetched new message data:', { messageData, messageError })

        if (messageError) {
          console.error('Error fetching message data:', messageError)
          return
        }

        setMessages(prev => {
          // Check if message already exists
          if (prev.some(msg => msg.id === messageData.id)) {
            console.log('Message already exists, skipping:', messageData.id)
            return prev
          }
          
          const newMessages = [...prev, transformMessage(messageData)]
          console.log('Updated messages:', newMessages)
          return newMessages
        })
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, supabase])

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)

    try {
      const { data } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          conversation_id,
          user_id,
          user:users!messages_user_id_fkey (
            id,
            username,
            full_name,
            last_seen
          ),
          files (
            id,
            message_id,
            user_id,
            bucket_path,
            file_name,
            file_size,
            content_type,
            is_image,
            image_width,
            image_height,
            created_at
          )
        `)
        .eq('conversation_id', conversationId)
        .is('channel_id', null)
        .order('created_at', { ascending: false })
        .range(messages.length, messages.length + MESSAGES_PER_PAGE - 1)

      if (data) {
        setMessages(prev => [...data.reverse().map(transformMessage), ...prev])
        setHasMore(data.length === MESSAGES_PER_PAGE)
      }
    } catch (error) {
      console.error('Error loading more messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const sendMessage = async (content: string, file?: FileMetadata) => {
    if (!user) return

    try {
      console.log('Sending DM message:', { conversationId, content, userId: user.id, file })
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          channel_id: null,
          content,
          user_id: user.id
        })
        .select(`
          id,
          content,
          created_at,
          conversation_id,
          user_id,
          user:users!messages_user_id_fkey (
            id,
            username,
            full_name,
            last_seen
          )
        `)
        .single()

      console.log('Send message result:', { data, error })

      if (error) {
        console.error('Error sending message:', error)
        throw error
      }

      // Remove optimistic update since we have real-time subscription
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    sendMessage
  }
} 