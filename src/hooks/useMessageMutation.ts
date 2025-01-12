import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAuth } from '@/lib/auth'
import { useCallback, useState } from 'react'
import { FileMetadata } from '@/hooks/useFileUpload'

interface SendMessageParams {
  content: string
  channelId: string | null
  conversationId: string | null
  parentMessageId: string | null
  fileMetadata: FileMetadata | null
}

export function useMessageMutation() {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendMessage = async ({
    content,
    channelId,
    conversationId,
    parentMessageId,
    fileMetadata
  }: SendMessageParams) => {
    if (!user) return null

    setIsLoading(true)
    setError(null)

    try {
      const messageData = {
        content,
        user_id: user.id,
        channel_id: channelId,
        conversation_id: conversationId,
        parent_message_id: parentMessageId
      }

      // First insert the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (messageError) throw messageError

      // If we have a file, create the file record
      if (fileMetadata && message) {
        const { error: fileError } = await supabase
          .from('files')
          .insert({
            message_id: message.id,
            user_id: user.id,
            bucket_path: fileMetadata.bucket_path,
            file_name: fileMetadata.file_name,
            file_size: fileMetadata.file_size,
            content_type: fileMetadata.content_type,
            is_image: fileMetadata.is_image,
            image_width: fileMetadata.image_width,
            image_height: fileMetadata.image_height
          })

        if (fileError) throw fileError
      }

      return message
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err as Error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    sendMessage,
    isLoading,
    error
  }
} 