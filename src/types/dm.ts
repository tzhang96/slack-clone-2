import { Database } from './supabase'

export interface DMUser {
  id: string
  full_name: string
  username: string
  avatar_url?: string
  last_seen: string
}

export interface DMMessage {
  id: string
  conversation_id: string
  user_id: string
  content: string
  created_at: string
  user?: DMUser
}

export interface DMConversation {
  id: string
  created_at: string
  updated_at: string
  user1_id: string
  user2_id: string
  user1?: DMUser
  user2?: DMUser
  last_message?: DMMessage
}

// Helper type for Supabase
export type Tables = Database['public']['Tables']
export type DMConversationRow = Tables['dm_conversations']['Row']
export type DMMessageRow = Tables['dm_messages']['Row'] 