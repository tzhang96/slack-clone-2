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

export interface ReactionWithUser {
  id: string
  emoji: string
  user: {
    id: string
    full_name: string
    username: string
  }
}

export interface FileRow {
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

export interface FileInsert extends Omit<FileRow, 'id' | 'created_at'> {
  id?: string
  created_at?: string
}

export interface FileUpdate extends Partial<FileInsert> {}

export interface FileWithUser extends FileRow {
  user: {
    id: string
    full_name: string
    username: string
  }
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
      files: {
        Row: FileRow
        Insert: FileInsert
        Update: FileUpdate
      }
    }
  }
} 