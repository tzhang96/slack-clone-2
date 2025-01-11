import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Message, SupabaseMessage } from '@/types/chat'
import { ReactionWithUser } from '@/types/supabase'
import { useMessageMutation } from '@/hooks/useMessageMutation'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface MessageContext {
  type: 'channel' | 'dm' | 'thread';
  id: string;
  parentMessage?: {
    channelId: string | null;
    conversationId: string | undefined;
  };
}

interface UseUnifiedMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  isAtBottom: boolean;
  sendMessage: (content: string, file?: FileMetadata) => Promise<void>;
  loadMore: () => Promise<void>;
  checkIsAtBottom: (container: HTMLElement) => boolean;
  scrollToBottom: (container: HTMLElement, smooth?: boolean) => void;
  handleMessagesChange: (container: HTMLElement | null, newMessages: Message[]) => void;
}

interface FileMetadata {
  bucket_path: string;
  file_name: string;
  file_size: number;
  content_type: string;
  is_image: boolean;
  image_width?: number;
  image_height?: number;
}

// Helper function to transform Supabase message to our Message type
const transformMessage = (msg: SupabaseMessage): Message => {
  console.log('transformMessage input:', {
    id: msg.id,
    content: msg.content,
    user_id: msg.user_id,
    users: msg.users,
    files: msg.files,
    reply_count: msg.reply_count,
    latest_reply_at: msg.latest_reply_at,
    thread_participants: msg.thread_participants,
    raw: msg
  })

  // Handle users data from the join
  const userInfo = Array.isArray(msg.users) ? msg.users[0] : msg.users

  if (!userInfo) {
    console.error('No user data found for message:', msg.id)
  }

  const user = userInfo || {
    id: msg.user_id,
    username: 'Unknown',
    full_name: 'Unknown User',
    last_seen: null
  }

  console.log('User data for message:', {
    messageId: msg.id,
    foundUser: !!userInfo,
    user,
    rawUsers: msg.users
  })

  // Log file data before transformation
  if (msg.files && msg.files.length > 0) {
    console.log('File data for message:', {
      messageId: msg.id,
      files: msg.files,
      firstFile: msg.files[0]
    })
  }

  const message: Message = {
    id: msg.id,
    content: msg.content,
    createdAt: msg.created_at,
    channelId: msg.channel_id,
    conversationId: msg.conversation_id,
    parentMessageId: msg.parent_message_id,
    replyCount: msg.reply_count || 0,
    latestReplyAt: msg.latest_reply_at,
    threadParticipants: msg.thread_participants?.map(p => ({
      id: p.id,
      userId: p.user_id,
      lastReadAt: p.last_read_at,
      createdAt: p.created_at,
      user: p.users ? {
        id: p.users.id,
        username: p.users.username,
        fullName: p.users.full_name,
        lastSeen: p.users.last_seen
      } : undefined
    })) || [],
    user: {
      id: user.id,
      username: user.username || 'Unknown',
      fullName: user.full_name || 'Unknown User',
      lastSeen: user.last_seen || undefined
    },
    reactions: msg.reactions?.map(r => ({
      id: r.id,
      emoji: r.emoji,
      user: r.user?.[0] ? {
        id: r.user[0].id,
        username: r.user[0].username,
        full_name: r.user[0].full_name
      } : {
        id: 'unknown',
        username: 'unknown',
        full_name: 'Unknown User'
      }
    })) || [],
    file: msg.files?.[0] ? {
      id: msg.files[0].id,
      message_id: msg.files[0].message_id,
      user_id: msg.files[0].user_id,
      bucket_path: msg.files[0].bucket_path,
      file_name: msg.files[0].file_name,
      file_size: msg.files[0].file_size,
      content_type: msg.files[0].content_type,
      is_image: msg.files[0].is_image,
      image_width: msg.files[0].image_width || undefined,
      image_height: msg.files[0].image_height || undefined,
      created_at: msg.files[0].created_at
    } : undefined
  }

  console.log('Transformed message:', {
    id: message.id,
    content: message.content,
    replyCount: message.replyCount,
    latestReplyAt: message.latestReplyAt,
    threadParticipants: message.threadParticipants
  })

  return message
}

// Helper function to count Unicode characters correctly
const getUnicodeLength = (str: string) => {
  return Array.from(str).length
}

export function useUnifiedMessages(context: MessageContext): UseUnifiedMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

  // Helper function to create file record
  const createFileRecord = async (messageId: string, file: FileMetadata) => {
    console.log('Creating file record:', {
      messageId,
      file
    })

    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert({
        message_id: messageId,
        user_id: user!.id,
        bucket_path: file.bucket_path,
        file_name: file.file_name,
        file_size: file.file_size,
        content_type: file.content_type,
        is_image: file.is_image,
        ...(file.is_image ? {
          image_width: file.image_width,
          image_height: file.image_height,
        } : {})
      })
      .select()
      .single()

    console.log('File record result:', {
      data: fileData,
      error: fileError
    })

    if (fileError) {
      console.error('Error creating file record:', fileError)
      // If file record creation fails, delete the message
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
      throw fileError
    }

    return fileData
  }

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

  // Build the query filter based on context
  const getQueryFilter = useCallback(() => {
    if (!context.id || context.id === '') return null

    switch (context.type) {
      case 'channel':
        return {
          channelId: context.id,
          query: supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              channel_id,
              conversation_id,
              parent_message_id,
              user_id,
              reply_count,
              latest_reply_at,
              users (
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
            .eq('channel_id', context.id)
            .is('conversation_id', null)
            .is('parent_message_id', null)
        }
      case 'dm':
        return {
          conversationId: context.id,
          query: supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              channel_id,
              conversation_id,
              parent_message_id,
              user_id,
              reply_count,
              latest_reply_at,
              users (
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
            .is('channel_id', null)
            .eq('conversation_id', context.id)
            .is('parent_message_id', null)
        }
      case 'thread':
        console.log('Creating thread query filter for ID:', context.id)
        return {
          threadId: context.id,
          query: supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              channel_id,
              conversation_id,
              parent_message_id,
              user_id,
              reply_count,
              latest_reply_at,
              users (
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
              ),
              thread_participants!thread_participants_thread_id_fkey (
                id,
                user_id,
                last_read_at,
                created_at,
                users (
                  id,
                  username,
                  full_name,
                  last_seen
                )
              )
            `)
            .eq('parent_message_id', context.id)
        }
      default:
        return null
    }
  }, [context.id, context.type, supabase])

  // Fetch messages with proper filtering
  const fetchMessages = useCallback(async () => {
    if (!context.id) {
      console.log('No context.id provided, skipping fetch')
      setMessages([])
      setIsLoading(false)
      setCursor(null)
      setHasMore(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const filter = getQueryFilter()
      if (!filter) {
        console.log('No filter returned from getQueryFilter')
        setMessages([])
        setIsLoading(false)
        setCursor(null)
        setHasMore(false)
        return
      }

      console.log('Building fetch query for context:', {
        type: context.type,
        id: context.id,
        filter: filter
      })

      const query = supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          conversation_id,
          parent_message_id,
          user_id,
          reply_count,
          latest_reply_at,
          users (
            id,
            username,
            full_name,
            last_seen
          ),
          reactions (
            id,
            emoji,
            user:users (
              id,
              full_name,
              username
            )
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
          ),
          thread_participants!thread_participants_thread_id_fkey (
            id,
            user_id,
            last_read_at,
            created_at,
            users (
              id,
              username,
              full_name,
              last_seen
            )
          )
        `)

      // Add filters based on context type
      if (context.type === 'thread') {
        query.eq('parent_message_id', context.id)
      } else {
        query
          .eq(filter.channelId ? 'channel_id' : 'conversation_id', context.id)
          .is('parent_message_id', null)
          .is(context.type === 'channel' ? 'conversation_id' : 'channel_id', null)
      }

      // Add ordering and limit
      query
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      console.log('Executing query with filters')
      const { data, error } = await query

      if (error) {
        console.error('Error fetching messages:', error)
        throw error
      }

      console.log('Query results:', {
        messageCount: data?.length,
        firstMessage: data?.[0],
        firstMessageReplyCount: data?.[0]?.reply_count,
        context: context
      })

      if (!data || data.length === 0) {
        console.log('No messages found')
        setMessages([])
        setHasMore(false)
        setCursor(null)
        setIsLoading(false)
        return
      }

      const messagesData = data as unknown as SupabaseMessage[]
      
      setHasMore(messagesData.length === MESSAGES_PER_PAGE)
      
      if (messagesData.length > 0) {
        setCursor(messagesData[messagesData.length - 1].created_at)
      } else {
        setCursor(null)
      }

      const transformedMessages = messagesData.map(transformMessage).reverse()
      console.log('Final transformed messages with thread info:', transformedMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        hasFile: !!msg.file,
        replyCount: msg.replyCount,
        latestReplyAt: msg.latestReplyAt
      })))
      
      setMessages(transformedMessages)
    } catch (error) {
      console.error('Error in fetchMessages:', error)
      setError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [context.id, context.type, supabase, getQueryFilter])

  // Load initial messages
  useEffect(() => {
    if (!context.id || context.id === '') {
      setMessages([])
      setIsLoading(false)
      setCursor(null)
      setHasMore(false)
      return
    }

    console.log(`Fetching initial ${context.type} messages for ID:`, context.id)
    fetchMessages()
  }, [context.id, context.type, fetchMessages])

  // Subscribe to real-time message changes
  useEffect(() => {
    if (!context.id) return

    const filter = getQueryFilter()
    if (!filter) return

    const channelFilter = (() => {
      switch (context.type) {
        case 'channel':
          return `channel_id=eq.${context.id}`
        case 'dm':
          return `conversation_id=eq.${context.id}`
        case 'thread':
          return `parent_message_id=eq.${context.id}`
        default:
          return null
      }
    })()

    if (!channelFilter) return

    type MessagePayload = RealtimePostgresChangesPayload<{
      id: string;
      content: string;
      [key: string]: any;
    }>

    type ReactionPayload = RealtimePostgresChangesPayload<{
      message_id: string;
      [key: string]: any;
    }>

    // Message subscription
    const messageChannel = supabase
      .channel(`messages:${context.id}`)
      .on<MessagePayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: channelFilter
        },
        async (payload) => {
          console.log('Message change received:', payload)

          if (payload.eventType === 'INSERT' && 'new' in payload && payload.new) {
            const newPayload = payload.new as unknown as {
              id: string
              content: string
              channel_id: string | null
              conversation_id: string | null
              parent_message_id: string | null
            }
            
            // Skip if this is a DM message and we're in a channel, or vice versa
            if (context.type === 'channel' && newPayload.conversation_id !== null) {
              return
            }
            if (context.type === 'dm' && newPayload.channel_id !== null) {
              return
            }

            // Skip thread replies in non-thread contexts
            if (context.type !== 'thread' && newPayload.parent_message_id !== null) {
              // But if this is a thread reply, update the parent message's reply count
              if (newPayload.parent_message_id) {
                const { data: parentData, error: parentError } = await supabase
                  .from('messages')
                  .select(`
                    id,
                    content,
                    created_at,
                    channel_id,
                    conversation_id,
                    parent_message_id,
                    user_id,
                    reply_count,
                    latest_reply_at,
                    users (
                      id,
                      username,
                      full_name,
                      last_seen
                    ),
                    reactions (
                      id,
                      emoji,
                      user:users (
                        id,
                        full_name,
                        username
                      )
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
                    ),
                    thread_participants!thread_participants_thread_id_fkey (
                      id,
                      user_id,
                      last_read_at,
                      created_at,
                      users (
                        id,
                        username,
                        full_name,
                        last_seen
                      )
                    )
                  `)
                  .eq('id', newPayload.parent_message_id)
                  .single()

                if (!parentError && parentData) {
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === newPayload.parent_message_id
                        ? transformMessage(parentData as unknown as SupabaseMessage)
                        : m
                    )
                  )
                }
              }
              return
            }

            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .select(`
                *,
                users (
                  id,
                  username,
                  full_name,
                  last_seen
                ),
                reactions (
                  id,
                  emoji,
                  user:users (
                    id,
                    full_name,
                    username
                  )
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
                ),
                thread_participants!thread_participants_thread_id_fkey (
                  id,
                  user_id,
                  last_read_at,
                  created_at,
                  users (
                    id,
                    username,
                    full_name,
                    last_seen
                  )
                )
              `)
              .eq('id', newPayload.id)
              .single()

            if (messageError) {
              console.error('Error fetching message data:', messageError)
              return
            }

            console.log('Fetched new message data:', messageData)
            
            if (!messageData) {
              console.error('No message data found for id:', newPayload.id)
              return
            }

            setMessages(prev => {
              const withoutOptimistic = prev.filter(m => 
                !(m.id.startsWith('temp-') && m.content === newPayload.content)
              )
              
              if (withoutOptimistic.some(m => m.id === newPayload.id)) {
                return withoutOptimistic
              }
              
              return [...withoutOptimistic, transformMessage(messageData as unknown as SupabaseMessage)]
            })
          }
        }
      )
      .subscribe()

    // File subscription
    const fileChannel = supabase
      .channel(`files:${context.id}`)
      .on<RealtimePostgresChangesPayload<{
        id: string;
        message_id: string;
        [key: string]: any;
      }>>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files'
        },
        async (payload) => {
          console.log('File change detected:', payload)
          if (payload.eventType === 'INSERT' && 'new' in payload && payload.new) {
            const filePayload = payload.new as unknown as { message_id: string }
            const messageId = filePayload.message_id
            
            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .select(`
                id,
                content,
                created_at,
                channel_id,
                conversation_id,
                parent_message_id,
                user_id,
                reply_count,
                latest_reply_at,
                users (
                  id,
                  username,
                  full_name,
                  last_seen
                ),
                reactions (
                  id,
                  emoji,
                  user:users (
                    id,
                    full_name,
                    username
                  )
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
                ),
                thread_participants!thread_participants_thread_id_fkey (
                  id,
                  user_id,
                  last_read_at,
                  created_at,
                  users (
                    id,
                    username,
                    full_name,
                    last_seen
                  )
                )
              `)
              .eq('id', messageId)
              .single()

            if (messageError) {
              console.error('Error fetching updated message:', messageError)
              return
            }

            if (!messageData) {
              console.error('No message data found for id:', messageId)
              return
            }

            setMessages(prev => 
              prev.map(m => 
                m.id === messageId
                  ? transformMessage(messageData as unknown as SupabaseMessage)
                  : m
              )
            )
          }
        }
      )
      .subscribe()

    // Reaction subscription
    const reactionChannel = supabase
      .channel(`reactions:${context.id}`)
      .on<ReactionPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        async (payload) => {
          console.log('Reaction change detected:', payload)
          // Fetch updated message data to get latest reactions
          if (payload.eventType === 'INSERT' && 'new' in payload && payload.new) {
            const reactionPayload = payload.new as unknown as { message_id: string }
            const messageId = reactionPayload.message_id
            
            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .select(`
                id,
                content,
                created_at,
                channel_id,
                conversation_id,
                parent_message_id,
                user_id,
                reply_count,
                latest_reply_at,
                users (
                  id,
                  username,
                  full_name,
                  last_seen
                ),
                reactions (
                  id,
                  emoji,
                  user:users (
                    id,
                    full_name,
                    username
                  )
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
                ),
                thread_participants!thread_participants_thread_id_fkey (
                  id,
                  user_id,
                  last_read_at,
                  created_at,
                  users (
                    id,
                    username,
                    full_name,
                    last_seen
                  )
                )
              `)
              .eq('id', messageId)
              .single()

            if (messageError) {
              console.error('Error fetching updated message:', messageError)
              return
            }

            if (!messageData) {
              console.error('No message data found for id:', messageId)
              return
            }

            setMessages(prev => 
              prev.map(m => 
                m.id === messageId
                  ? transformMessage(messageData as unknown as SupabaseMessage)
                  : m
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      messageChannel.unsubscribe()
      fileChannel.unsubscribe()
      reactionChannel.unsubscribe()
    }
  }, [context.id, context.type, supabase, getQueryFilter, fetchMessages])

  // Load more messages
  const loadMore = useCallback(async () => {
    const filter = getQueryFilter()
    if (!filter || !cursor || !hasMore || isLoadingMore) return
    setIsLoadingMore(true)
    setError(null)

    try {
      const { data, error } = await filter.query
        .order('created_at', { ascending: false })
        .lt('created_at', cursor)
        .limit(MESSAGES_PER_PAGE)

      if (error) throw error

      if (!data || data.length === 0) {
        setHasMore(false)
        return
      }

      // Fetch users separately
      const userIds = Array.from(new Set(data.map(msg => msg.user_id)))
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, last_seen')
        .in('id', userIds)

      if (userError) {
        console.error('Error fetching users:', userError)
        throw userError
      }

      // Combine messages with user data
      const messagesWithUsers = data.map(msg => ({
        ...msg,
        users: [userData.find(u => u.id === msg.user_id)].filter(Boolean),
        reply_count: msg.reply_count,
        latest_reply_at: msg.latest_reply_at
      }))

      // Fetch reactions
      const messageIds = data.map(msg => msg.id)
      const { data: reactionsData, error: reactionsError } = await supabase
        .from('reactions')
        .select(`
          id,
          emoji,
          message_id,
          user_id,
          users!reactions_user_id_fkey (
            id,
            full_name,
            username
          )
        `)
        .in('message_id', messageIds)

      if (reactionsError) {
        console.error('Error fetching reactions:', reactionsError)
        throw reactionsError
      }

      // Combine everything
      const completeMessages = messagesWithUsers.map(msg => ({
        ...msg,
        reactions: reactionsData
          .filter(r => r.message_id === msg.id)
          .map(r => ({
            id: r.id,
            emoji: r.emoji,
            user: r.users[0]
          }))
      }))

      const messagesData = completeMessages as unknown as SupabaseMessage[]

      setHasMore(messagesData.length === MESSAGES_PER_PAGE)

      if (messagesData.length > 0) {
        setCursor(messagesData[messagesData.length - 1].created_at)
      }

      setMessages(prev => [...messagesData.map(transformMessage).reverse(), ...prev])
    } catch (error) {
      console.error('Error loading more messages:', error)
      setError(error as Error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [context.id, cursor, hasMore, isLoadingMore, supabase, getQueryFilter])

  // Send message with optimistic update
  const sendMessage = useCallback(async (content: string, file?: FileMetadata) => {
    if (!user || !context.id) return

    // Helper function to create file record
    const createFileRecord = async (messageId: string, file: FileMetadata) => {
      console.log('Creating file record:', {
        messageId,
        file
      })

      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          message_id: messageId,
          user_id: user!.id,
          bucket_path: file.bucket_path,
          file_name: file.file_name,
          file_size: file.file_size,
          content_type: file.content_type,
          is_image: file.is_image,
          ...(file.is_image ? {
            image_width: file.image_width,
            image_height: file.image_height,
          } : {})
        })
        .select()
        .single()

      console.log('File record result:', {
        data: fileData,
        error: fileError
      })

      if (fileError) {
        console.error('Error creating file record:', fileError)
        // If file record creation fails, delete the message
        await supabase
          .from('messages')
          .delete()
          .eq('id', messageId)
        throw fileError
      }

      return fileData
    }

    console.log('sendMessage user data:', {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
      raw: user
    })

    // Validate message length
    if (content) {
      const MAX_LENGTH = 4000
      const contentLength = getUnicodeLength(content)
      if (contentLength > MAX_LENGTH) {
        const error = new Error(`Message exceeds maximum length of ${MAX_LENGTH} characters (current length: ${contentLength})`)
        console.error('Message length error:', error)
        setError(error)
        return
      }
    }

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      channelId: context.type === 'channel' ? context.id : null,
      conversationId: context.type === 'dm' ? context.id : undefined,
      parentMessageId: context.type === 'thread' ? context.id : undefined,
      replyCount: 0,
      user: {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown',
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
        lastSeen: null
      },
      reactions: [],
      ...(file && {
        file: {
          id: 'temp-file',
          message_id: `temp-${Date.now()}`,
          user_id: user.id,
          bucket_path: file.bucket_path,
          file_name: file.file_name,
          file_size: file.file_size,
          content_type: file.content_type,
          is_image: file.is_image,
          ...(file.is_image ? {
            image_width: file.image_width,
            image_height: file.image_height,
          } : {}),
          created_at: new Date().toISOString()
        }
      })
    }

    // Only add optimistic message for non-thread messages
    if (context.type !== 'thread') {
      setMessages(prev => [...prev, optimisticMessage])
    }

    try {
      let message;

      // Send the actual message
      switch (context.type) {
        case 'channel':
          console.log('Sending channel message:', {
            channelId: context.id,
            content,
            file,
            userId: user.id
          })
          await sendMessageMutation(context.id, content, file)
          break

        case 'dm':
        case 'thread':
          const messageData = {
            content,
            user_id: user.id,
            ...(context.type === 'dm' ? {
              conversation_id: context.id,
              channel_id: null
            } : {
              parent_message_id: context.id,
              channel_id: context.parentMessage?.channelId,
              conversation_id: context.parentMessage?.conversationId
            })
          }

          console.log(`Sending ${context.type} message:`, messageData)

          const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert(messageData)
            .select()
            .single()

          if (messageError) {
            console.error(`Error creating ${context.type} message:`, messageError)
            throw messageError
          }

          message = newMessage
          console.log(`Created ${context.type} message:`, message)

          // Handle file if present
          if (file && message) {
            await createFileRecord(message.id, file)
          }
          break
      }
      // Don't update state here - let the subscription handle it
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setError(error as Error)
    }
  }, [context.id, context.type, context.parentMessage, user, sendMessageMutation, supabase])

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
    handleMessagesChange
  }
} 