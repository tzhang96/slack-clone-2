import { ReactionWithUser } from './supabase'

export interface MessageFile {
  id: string
  message_id: string
  user_id: string
  bucket_path: string
  file_name: string
  file_size: number
  content_type: string
  is_image: boolean
  image_width?: number
  image_height?: number
  created_at: string
}

export interface Message {
  id: string
  content: string
  createdAt: string
  channelId: string | null
  conversationId?: string
  parentMessageId?: string
  replyCount?: number
  latestReplyAt?: string
  threadParticipants?: Array<{
    id: string
    userId: string
    lastReadAt: string
    createdAt: string
    user?: {
      id: string
      username: string
      fullName: string
      lastSeen?: string | null
    }
  }>
  user: {
    id: string
    fullName: string
    username: string
    lastSeen?: string | null
  }
  reactions?: ReactionWithUser[]
  file?: MessageFile
}

export interface MessageRowData {
  messages: Message[]
  currentUserId: string | undefined
  setSize: (index: number, size: number) => void
  onThreadClick?: (message: Message) => void
  context: 'thread' | 'channel' | 'dm'
}

export interface SupabaseMessage {
  id: string
  content: string
  created_at: string
  channel_id: string | null
  conversation_id?: string
  parent_message_id?: string
  user_id: string
  reply_count?: number
  latest_reply_at?: string
  thread_participants?: Array<{
    id: string
    user_id: string
    last_read_at: string
    created_at: string
    users: {
      id: string
      username: string
      full_name: string
      last_seen?: string | null
    }
  }>
  users: {
    id: string
    username: string
    full_name: string
    last_seen?: string | null
  }
  reactions?: Array<{
    id: string
    emoji: string
    user: Array<{
      id: string
      username: string
      full_name: string
    }>
  }>
  files?: MessageFile[]
}

export interface DMConversation {
  id: string
  createdAt: string
  updatedAt: string
  user1: {
    id: string
    username: string
    fullName: string
    status?: string
  }
  user2: {
    id: string
    username: string
    fullName: string
    status?: string
  }
  user1_id: string
  user2_id: string
  otherUser: {
    id: string
    username: string
    fullName: string
    status?: string
  }
} 