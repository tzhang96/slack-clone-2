export interface Message {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    username: string
    fullName: string
  }
}

export interface MessageRowData {
  messages: Message[]
  currentUserId: string | undefined
  setSize: (index: number, size: number) => void
}

interface SupabaseUser {
  id: string
  username: string
  full_name: string
}

export interface SupabaseMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  users: SupabaseUser | SupabaseUser[]
} 