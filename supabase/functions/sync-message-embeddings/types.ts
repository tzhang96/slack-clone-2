export interface Message {
  id: number
  content: string
  user_id: string
}

export interface EmbeddingStatus {
  message_id: number
  embedding_id: string
  processed_at: string
  status: 'pending' | 'completed' | 'failed'
  error_message?: string
} 