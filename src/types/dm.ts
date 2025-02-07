import { Database } from './supabase'

export interface DMUser {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
  last_seen: string | null
}

export interface DMMessage {
  id: string
  conversation_id: string
  user_id: string
  content: string
  created_at: string
  user: DMUser | null
}

export interface DMConversation {
  id: string
  created_at: string
  updated_at: string
  user1_id: string
  user2_id: string
  user1: DMUser | null
  user2: DMUser | null
  last_message: DMMessage | null
}

// Helper type for Supabase
export type Tables = Database['public']['Tables']
export type DMConversationRow = Tables['dm_conversations']['Row']
export type DMMessageRow = Tables['dm_messages']['Row'] 