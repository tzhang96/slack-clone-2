import { ReactionWithUser } from './supabase'

export interface Message {
  id: string
  content: string
  createdAt: string
  channelId: string
  user: {
    id: string
    fullName: string
    username: string
    lastSeen?: string
  }
  reactions?: ReactionWithUser[]
}

export interface MessageRowData {
  messages: Message[]
  currentUserId: string | undefined
  setSize: (index: number, size: number) => void
}

export interface SupabaseMessage {
  id: string
  content: string
  created_at: string
  channel_id: string
  user_id: string
  users: {
    id: string
    username: string
    full_name: string
    last_seen?: string
  }[]
  reactions?: {
    id: string
    emoji: string
    user: {
      id: string
      full_name: string
      username: string
    }[]
  }[]
} 