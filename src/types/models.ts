// These types represent our application domain models
export interface User {
  id: string
  username: string
  fullName: string
  lastSeen: string | null
  status: string | null
}

export interface Channel {
  id: string
  name: string
  description: string | null
  createdAt: string
}

// This is the single source of truth for file types in the frontend
export interface File {
  id: string
  messageId: string
  userId: string
  bucketPath: string
  fileName: string
  fileSize: number
  contentType: string
  isImage: boolean
  imageWidth: number | null
  imageHeight: number | null
  createdAt: string
}

// Import ReactionWithUser instead of defining our own Reaction type
import { ReactionWithUser } from './supabase'

export interface Message {
  id: string
  content: string
  createdAt: string
  user_id: string
  channelId: string | null
  conversationId: string | null
  parentMessageId: string | null
  replyCount: number
  latestReplyAt: string | null
  isThreadParent: boolean
  user: User
  reactions: ReactionWithUser[]
  file: File | null
  threadParticipants: ThreadParticipant[] | null
}

export interface ThreadParticipant {
  id: string
  threadId: string
  userId: string
  lastReadAt: string
  createdAt: string
  user: User | null
}

export interface Thread {
  parentMessage: Message | null
  replies: Message[]
  participants: ThreadParticipant[]
} 