import { ReactionWithUser } from './supabase'
import { File, ThreadParticipant, Message } from './models'
import { FileMetadata } from '@/hooks/useFileUpload'

export type MessageContext = 'channel' | 'dm' | 'thread'

// Re-export Message type from models
export type { Message } from './models'

export interface MessageRowData {
  messages: Message[]
  currentUserId: string | null
  setSize: (index: number, size: number) => void
  onThreadClick: ((message: Message) => void) | null
  context: 'thread' | 'channel' | 'dm'
}

export interface UserJoinResult {
  id: string
  username: string
  full_name: string
  last_seen: string | null
  status: string | null
}

export interface SupabaseMessage {
  id: string
  content: string
  created_at: string
  channel_id: string | null
  conversation_id: string | null
  parent_message_id: string | null
  user_id: string
  reply_count: number | null
  latest_reply_at: string | null
  thread_participants: Array<{
    id: string
    user_id: string
    last_read_at: string
    created_at: string
    users: UserJoinResult
  }> | null
  users: Array<UserJoinResult> | null
  reactions: Array<{
    id: string
    emoji: string
    user: Array<{
      id: string
      username: string
      full_name: string
    }>
  }> | null
  files: File[] | null
}

export interface DMConversation {
  id: string
  createdAt: string
  updatedAt: string
  user1: {
    id: string
    username: string
    fullName: string
    status: string | null
    is_bot: boolean
  }
  user2: {
    id: string
    username: string
    fullName: string
    status: string | null
    is_bot: boolean
  }
  user1_id: string
  user2_id: string
  otherUser: {
    id: string
    username: string
    fullName: string
    status: string | null
    is_bot: boolean
  }
} 