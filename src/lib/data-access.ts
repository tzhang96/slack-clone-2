import { supabase } from '@/lib/supabase'
import { DataTransformer } from '@/lib/transformers'
import type { Message, Thread, ThreadParticipant } from '@/types/models'
import type { DbJoinedMessage, DbJoinedThreadParticipant } from '@/types/database'

export const MESSAGE_SELECT = `
  id,
  content,
  created_at,
  channel_id,
  conversation_id,
  parent_message_id,
  user_id,
  reply_count,
  latest_reply_at,
  is_thread_parent,
  users:users!inner (
    id,
    username,
    full_name,
    last_seen,
    status
  ),
  reactions (
    id,
    emoji,
    user_id,
    users:users!inner (
      id,
      username,
      full_name,
      last_seen,
      status
    )
  ),
  files (
    id,
    message_id,
    user_id,
    bucket_path,
    file_name,
    file_size,
    content_type,
    is_image,
    image_width,
    image_height,
    created_at
  ),
  thread_participants!thread_participants_thread_id_fkey (
    id,
    user_id,
    last_read_at,
    created_at,
    users:users!inner (
      id,
      username,
      full_name,
      last_seen,
      status
    )
  )
`

export class MessageRepository {
  static async getMessage(messageId: string): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('id', messageId)
      .single()

    if (error || !data) return null
    return DataTransformer.toMessage(data as DbJoinedMessage)
  }

  static async getThreadMessages(threadId: string): Promise<Thread | null> {
    // Get parent message
    const parent = await this.getMessage(threadId)
    if (!parent) return null

    // Get replies
    const { data: repliesData, error: repliesError } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('parent_message_id', threadId)
      .order('created_at', { ascending: true })

    if (repliesError) return null

    // Get participants
    const { data: participantsData, error: participantsError } = await supabase
      .from('thread_participants')
      .select(`
        id,
        thread_id,
        user_id,
        last_read_at,
        created_at,
        users:users!inner (
          id,
          username,
          full_name,
          last_seen,
          status
        )
      `)
      .eq('thread_id', threadId)

    if (participantsError) return null

    const replies = (repliesData as DbJoinedMessage[])
      .map(msg => DataTransformer.toMessage(msg))
      .filter((msg): msg is Message => msg !== null)

    const participants = (participantsData as DbJoinedThreadParticipant[])
      .map(p => DataTransformer.toThreadParticipant({ ...p, thread_id: threadId }))

    return {
      parentMessage: parent,
      replies,
      participants
    }
  }

  static async sendReply(threadId: string, content: string, userId: string): Promise<Message | null> {
    const parent = await this.getMessage(threadId)
    if (!parent) return null

    const { data, error } = await supabase
      .from('messages')
      .insert({
        content,
        parent_message_id: threadId,
        user_id: userId,
        channel_id: parent.channelId,
        conversation_id: parent.conversationId
      })
      .select(MESSAGE_SELECT)
      .single()

    if (error || !data) return null
    return DataTransformer.toMessage(data as DbJoinedMessage)
  }
} 