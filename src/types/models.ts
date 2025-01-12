// These types represent our application domain models
export interface User {
  id: string
  username: string
  fullName: string
  lastSeen?: string
  status?: string
}

export interface File {
  id: string
  messageId: string
  userId: string
  bucketPath: string
  fileName: string
  fileSize: number
  contentType: string
  isImage: boolean
  imageWidth?: number
  imageHeight?: number
  createdAt: string
}

export interface Reaction {
  id: string
  emoji: string
  userId: string
  user: User
}

export interface Message {
  id: string
  content: string
  createdAt: string
  channelId?: string
  conversationId?: string
  parentMessageId?: string
  replyCount: number
  latestReplyAt?: string
  isThreadParent: boolean
  user: User
  reactions: Reaction[]
  file?: File
  threadParticipants?: ThreadParticipant[]
}

export interface ThreadParticipant {
  id: string
  threadId: string
  userId: string
  lastReadAt: string
  createdAt: string
  user?: User
}

export interface Thread {
  parentMessage: Message
  replies: Message[]
  participants: ThreadParticipant[]
} 