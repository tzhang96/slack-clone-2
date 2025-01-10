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
  channelId: string
  user: {
    id: string
    fullName: string
    username: string
    lastSeen?: string
  }
  reactions?: ReactionWithUser[]
  file?: MessageFile
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
  files?: {
    id: string
    message_id: string
    user_id: string
    bucket_path: string
    file_name: string
    file_size: number
    content_type: string
    is_image: boolean
    image_width: number | null
    image_height: number | null
    created_at: string
  }[]
} 