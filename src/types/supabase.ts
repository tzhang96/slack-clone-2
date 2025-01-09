export interface UserRow {
  id: string
  email: string
  username: string
  full_name: string
  created_at: string
}

export interface ChannelRow {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface MessageRow {
  id: string
  channel_id: string
  user_id: string
  content: string
  created_at: string
}

export interface ReactionRow {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface UserInsert extends Omit<UserRow, 'id' | 'created_at'> {
  id?: string
  created_at?: string
}

export interface UserUpdate extends Partial<UserInsert> {}

export interface ChannelInsert extends Omit<ChannelRow, 'id' | 'created_at'> {
  id?: string
  created_at?: string
}

export interface ChannelUpdate extends Partial<ChannelInsert> {}

export interface MessageInsert extends Omit<MessageRow, 'id' | 'created_at'> {
  id?: string
  created_at?: string
}

export interface MessageUpdate extends Partial<MessageInsert> {}

export interface ReactionInsert extends Omit<ReactionRow, 'id' | 'created_at'> {
  id?: string
  created_at?: string
}

export interface ReactionUpdate extends Partial<ReactionInsert> {}

export interface ReactionWithUser extends ReactionRow {
  user: Pick<UserRow, 'id' | 'full_name' | 'username'>
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
      }
      channels: {
        Row: ChannelRow
        Insert: ChannelInsert
        Update: ChannelUpdate
      }
      messages: {
        Row: MessageRow
        Insert: MessageInsert
        Update: MessageUpdate
      }
      reactions: {
        Row: ReactionRow
        Insert: ReactionInsert
        Update: ReactionUpdate
      }
    }
  }
} 