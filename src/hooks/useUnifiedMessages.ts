import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import type { Message, File as CustomFile } from '@/types/models'
import type { DbJoinedMessage } from '@/types/database'
import { useMessageMutation } from '@/hooks/useMessageMutation'
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'
import { DataTransformer } from '@/lib/transformers'
import { MESSAGE_SELECT } from '@/lib/data-access'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import type { FileMetadata } from '@/hooks/useFileUpload'

interface MessageContext {
  type: 'channel' | 'dm' | 'thread'
  id: string | undefined
  parentMessage?: {
    channelId: string | null
    conversationId: string | null
  } | null
  enabled?: boolean
}

interface UseUnifiedMessagesReturn {
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: Error | null
  isAtBottom: boolean
  sendMessage: (content: string, file: FileMetadata | null) => Promise<void>
  loadMore: () => Promise<void>
  checkIsAtBottom: (container: HTMLElement) => boolean
  scrollToBottom: (container: HTMLElement, smooth: boolean) => void
  handleMessagesChange: (container: HTMLElement | null, newMessages: Message[]) => void
  jumpToMessage: (messageId: string, container: HTMLElement) => Promise<void>
}

export function useUnifiedMessages(context: MessageContext): UseUnifiedMessagesReturn {
  // Log hook initialization
  useEffect(() => {
    console.log('[useUnifiedMessages] Initialize:', {
      contextType: context.type,
      contextId: context.id,
      enabled: context.enabled,
      timestamp: new Date().toISOString()
    })
  }, [context.type, context.id, context.enabled])

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const { sendMessage: sendMessageMutation } = useMessageMutation()

  const MESSAGES_PER_PAGE = 25
  const SCROLL_THRESHOLD = 100

  // Reset state when context changes
  useEffect(() => {
    console.log('[useUnifiedMessages] Reset State:', {
      contextType: context.type,
      contextId: context.id,
      enabled: context.enabled,
      timestamp: new Date().toISOString()
    })

    // Always reset state when context changes
    setMessages([])
    setIsLoading(true) // Set loading to true immediately
    setError(null)
    setCursor(null)
    setHasMore(true)
    setIsLoadingMore(false)
    setIsAtBottom(true)
  }, [context.type, context.id, context.enabled])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!context.enabled || !context.id) {
      console.log('[useUnifiedMessages] Skip Fetch:', {
        enabled: context.enabled,
        contextId: context.id,
        timestamp: new Date().toISOString()
      })
      return
    }

    console.log('[useUnifiedMessages] Fetch Start:', {
      contextType: context.type,
      contextId: context.id,
      timestamp: new Date().toISOString()
    })

    setIsLoading(true)
    setError(null)

    try {
      const query = supabase
        .from('messages')
        .select(MESSAGE_SELECT)

      // Add filters based on context type
      if (context.type === 'thread') {
        query.eq('parent_message_id', context.id)
      } else {
        query
          .eq(context.type === 'channel' ? 'channel_id' : 'conversation_id', context.id)
          .is('parent_message_id', null)
          .is(context.type === 'channel' ? 'conversation_id' : 'channel_id', null)
      }

      // Add ordering and limit
      query
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        setMessages([])
        setHasMore(false)
        setCursor(null)
        return
      }

      const validMessages = (data as DbJoinedMessage[])
        .map(msg => DataTransformer.toMessage(msg))
        .filter((msg): msg is Message => msg !== null)
        .reverse()

      console.log('[useUnifiedMessages] Fetch Complete:', {
        contextType: context.type,
        contextId: context.id,
        messageCount: validMessages.length,
        timestamp: new Date().toISOString()
      })

      setMessages(validMessages)
      setHasMore(validMessages.length === MESSAGES_PER_PAGE)
      setCursor(data[data.length - 1].created_at)
    } catch (err) {
      console.error('Error in fetchMessages:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [context.enabled, context.id, context.type, supabase])

  // Effect to handle fetching when context changes
  useEffect(() => {
    if (context.enabled) {
      fetchMessages()
    } else {
      setIsLoading(false)
    }
  }, [context.enabled, fetchMessages])

  // Set up message subscriptions
  useEffect(() => {
    let isSubscribed = true
    let messageChannel: RealtimeChannel | null = null

    if (!context.enabled || !context.id) {
      console.log('[useUnifiedMessages] Skip Subscription:', {
        enabled: context.enabled,
        contextId: context.id,
        timestamp: new Date().toISOString()
      })
      return
    }

    console.log('[useUnifiedMessages] Subscribe:', {
      contextType: context.type,
      contextId: context.id,
      timestamp: new Date().toISOString()
    })

    // Set up real-time subscription
    messageChannel = supabase
      .channel(`messages:${context.id}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: context.type === 'thread' 
            ? `parent_message_id=eq.${context.id}` 
            : `${context.type === 'channel' ? 'channel_id' : 'conversation_id'}=eq.${context.id} and parent_message_id is null`
        },
        async (payload) => {
          if (!isSubscribed) return // Skip if component is unmounted

          console.log('[useUnifiedMessages] Message Event:', {
            eventType: payload.eventType,
            contextType: context.type,
            contextId: context.id,
            timestamp: new Date().toISOString()
          })

          if (payload.eventType === 'INSERT') {
            // Skip if this is a thread message and we're in channel view
            if (context.type === 'channel' && payload.new.parent_message_id) {
              return;
            }

            // Fetch the complete message
            const { data: messageData } = await supabase
              .from('messages')
              .select(MESSAGE_SELECT)
              .eq('id', payload.new.id)
              .single()

            if (messageData && isSubscribed) { // Check isSubscribed again after async operation
              const transformedMessage = DataTransformer.toMessage(messageData as DbJoinedMessage)
              if (transformedMessage) {
                setMessages(prev => {
                  // Check if message already exists
                  if (prev.some(m => m.id === transformedMessage.id)) {
                    return prev
                  }
                  return [...prev, transformedMessage]
                })
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[useUnifiedMessages] Unsubscribe:', {
        contextType: context.type,
        contextId: context.id,
        timestamp: new Date().toISOString()
      })
      isSubscribed = false
      if (messageChannel) {
        messageChannel.unsubscribe()
      }
    }
  }, [context.enabled, context.id, context.type, supabase])

  // Function to check if scroll position is at bottom
  const checkIsAtBottom = useCallback((container: HTMLElement) => {
    const { scrollHeight, scrollTop, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom <= SCROLL_THRESHOLD
  }, [])

  // Function to scroll to bottom
  const scrollToBottom = useCallback((container: HTMLElement, smooth = true) => {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }, [])

  // Update isAtBottom state when messages change
  const handleMessagesChange = useCallback((container: HTMLElement | null, newMessages: Message[]) => {
    if (!container) return

    const wasAtBottom = checkIsAtBottom(container)
    setIsAtBottom(wasAtBottom)

    // If we were at bottom, scroll to bottom after messages update
    if (wasAtBottom) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom(container)
      })
    }
  }, [checkIsAtBottom, scrollToBottom])

  // Load more messages
  const loadMore = async () => {
    if (!context.id || isLoadingMore || !hasMore || !cursor) return

    setIsLoadingMore(true)

    try {
      const query = supabase
                  .from('messages')
        .select(MESSAGE_SELECT)

      // Add filters based on context type
      if (context.type === 'thread') {
        query.eq('parent_message_id', context.id)
      } else {
        query
          .eq(context.type === 'channel' ? 'channel_id' : 'conversation_id', context.id)
          .is('parent_message_id', null)
          .is(context.type === 'channel' ? 'conversation_id' : 'channel_id', null)
      }

      // Add cursor pagination
      query
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        setHasMore(false)
        return
      }

      const validMessages = (data as DbJoinedMessage[])
        .map(msg => DataTransformer.toMessage(msg))
        .filter((msg): msg is Message => msg !== null)
        .reverse()

      setMessages(prev => [...prev, ...validMessages])
      setHasMore(validMessages.length === MESSAGES_PER_PAGE)
      setCursor(data[data.length - 1].created_at)
    } catch (err) {
      console.error('Error loading more messages:', err)
      setError(err as Error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Send a message
  const sendMessage = async (content: string, file: FileMetadata | null = null) => {
    if (!user || !content.trim() || !context.id) return

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      user_id: user.id,
      channelId: context.type === 'thread' ? context.parentMessage?.channelId ?? null : context.type === 'channel' ? context.id : null,
      conversationId: context.type === 'thread' ? context.parentMessage?.conversationId ?? null : context.type === 'dm' ? context.id : null,
      parentMessageId: context.type === 'thread' ? context.id : null,
      replyCount: 0,
      latestReplyAt: null,
      isThreadParent: false,
      user: {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        fullName: user.user_metadata?.full_name || 'Anonymous',
        lastSeen: null,
        status: null
      },
      reactions: [],
      threadParticipants: null,
      file: file ? {
        id: 'temp-file',
        messageId: `temp-${Date.now()}`,
        userId: user.id,
        bucketPath: file.bucket_path,
        fileName: file.file_name,
        fileSize: file.file_size,
        contentType: file.content_type,
        isImage: file.is_image,
        imageWidth: file.image_width,
        imageHeight: file.image_height,
        createdAt: new Date().toISOString()
      } as CustomFile : null
    }

    // Add optimistic message to state
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const messageParams = {
        content,
        channelId: context.type === 'thread' ? context.parentMessage?.channelId ?? null : context.type === 'channel' ? context.id : null,
        conversationId: context.type === 'thread' ? context.parentMessage?.conversationId ?? null : context.type === 'dm' ? context.id : null,
        parentMessageId: context.type === 'thread' ? context.id : null,
        fileMetadata: file
      }

      const newMessage = await sendMessageMutation(messageParams)
      if (!newMessage) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        return
      }

      // Fetch the complete message with the file
      const { data: updatedMessage, error: fetchError } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('id', newMessage.id)
        .single()

      if (fetchError) throw fetchError

      if (updatedMessage) {
        const transformedMessage = DataTransformer.toMessage(updatedMessage as DbJoinedMessage)
        if (transformedMessage) {
          // Replace optimistic message with real one
          setMessages(prev => prev.map(msg => 
            msg.id === optimisticMessage.id ? transformedMessage : msg
          ))
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setError(err as Error)
    }
  }

  // Function to fetch messages around a specific message
  const fetchMessagesAroundId = async (messageId: string) => {
    if (!context.id) return null;

    try {
      // First, fetch the target message to get its timestamp
      const { data: targetMessage, error: targetError } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', messageId)
        .single();

      if (targetError) throw targetError;
      if (!targetMessage) return null;

      // Then fetch messages around that timestamp
      const query = supabase
        .from('messages')
        .select(MESSAGE_SELECT);

      // Add filters based on context type
      if (context.type === 'thread') {
        query.eq('parent_message_id', context.id);
      } else {
        query
          .eq(context.type === 'channel' ? 'channel_id' : 'conversation_id', context.id)
          .is('parent_message_id', null)
          .is(context.type === 'channel' ? 'conversation_id' : 'channel_id', null);
      }

      // Fetch messages around the target timestamp
      const { data, error } = await query
        .or(`created_at.gte.${targetMessage.created_at},created_at.lte.${targetMessage.created_at}`)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;

      return data as DbJoinedMessage[];
    } catch (err) {
      console.error('Error fetching messages around ID:', err);
      return null;
    }
  };

  // Function to jump to a specific message
  const jumpToMessage = async (messageId: string, container: HTMLElement) => {
    try {
      // First check if the message is already in the current list
      const messageElement = container.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight class with transition
        messageElement.classList.add('highlight-message');
        // Remove after animation completes
        messageElement.addEventListener('animationend', () => {
          messageElement.classList.remove('highlight-message');
        }, { once: true });
        return;
      }

      // If message not found, fetch messages around it
      setIsLoading(true);
      setError(null);

      const messagesData = await fetchMessagesAroundId(messageId);
      if (!messagesData) {
        throw new Error('Failed to fetch messages');
      }

      const validMessages = messagesData
        .map(msg => DataTransformer.toMessage(msg))
        .filter((msg): msg is Message => msg !== null)
        .reverse();

      setMessages(validMessages);
      setHasMore(validMessages.length === MESSAGES_PER_PAGE);
      setCursor(messagesData[messagesData.length - 1].created_at);

      // Wait for the messages to render
      requestAnimationFrame(() => {
        // Find the target message element
        const messageElement = container.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight class with transition
          messageElement.classList.add('highlight-message');
          // Remove after animation completes
          messageElement.addEventListener('animationend', () => {
            messageElement.classList.remove('highlight-message');
          }, { once: true });
        }
      });
    } catch (err) {
      console.error('Error jumping to message:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isAtBottom,
    sendMessage,
    loadMore,
    checkIsAtBottom,
    scrollToBottom,
    handleMessagesChange,
    jumpToMessage
  }
} 