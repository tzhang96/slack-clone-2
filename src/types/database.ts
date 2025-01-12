// These types represent the exact shape of data returned from Supabase
export interface DbUser {
  id: string
  username: string
  full_name: string
  last_seen: string | null
  status?: string
}

// Represents the shape of joined data from Supabase
export interface DbJoinedUser {
  id: string
  username: string
  full_name: string
  last_seen: string | null
  status?: string
}

export interface DbJoinedReaction {
  id: string
  emoji: string
  user_id: string
  users: DbJoinedUser[]
}

export interface DbJoinedFile {
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
}

export interface DbJoinedThreadParticipant {
  id: string
  user_id: string
  last_read_at: string
  created_at: string
  users: DbJoinedUser[]
}

// This represents the exact shape of a message with all its joins as returned by Supabase
export interface DbJoinedMessage {
  id: string
  content: string
  created_at: string
  channel_id: string | null
  conversation_id: string | null
  parent_message_id: string | null
  user_id: string
  reply_count?: number
  latest_reply_at?: string
  is_thread_parent?: boolean
  users: DbJoinedUser[]
  reactions?: DbJoinedReaction[]
  files?: DbJoinedFile[]
  thread_participants?: DbJoinedThreadParticipant[]
}

// These represent the base table types without joins
export interface DbMessage {
  id: string
  content: string
  created_at: string
  channel_id: string | null
  conversation_id: string | null
  parent_message_id: string | null
  user_id: string
  reply_count?: number
  latest_reply_at?: string
  is_thread_parent?: boolean
}

export interface DbReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface DbFile {
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
}

export interface DbThreadParticipant {
  id: string
  thread_id: string
  user_id: string
  last_read_at: string
  created_at: string
} 