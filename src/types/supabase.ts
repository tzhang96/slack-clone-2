export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string
          status: 'online' | 'offline' | 'away'
          last_seen: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          full_name: string
          status?: 'online' | 'offline' | 'away'
          last_seen?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          full_name?: string
          status?: 'online' | 'offline' | 'away'
          last_seen?: string
          created_at?: string
        }
      }
      channels: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
    }
  }
} 