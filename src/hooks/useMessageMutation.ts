import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'

interface FileMetadata {
  bucket_path: string
  file_name: string
  file_size: number
  content_type: string
  is_image: boolean
  image_width?: number
  image_height?: number
}

export function useMessageMutation() {
  const supabase = createClientComponentClient<Database>()
  const { user } = useAuth()

  const sendMessage = useCallback(async (
    channelId: string,
    content: string,
    fileMetadata?: FileMetadata
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // First insert the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          content: content || '', // Empty string if no content
          user_id: user.id,
        })
        .select()
        .single()

      if (messageError) throw messageError

      // If there's file metadata, create the file record
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
            ...(fileMetadata.is_image ? {
              image_width: fileMetadata.image_width,
              image_height: fileMetadata.image_height,
            } : {}),
          })

        if (fileError) {
          // If file record creation fails, delete the message
          await supabase
            .from('messages')
            .delete()
            .eq('id', message.id)
          throw fileError
        }
      }

      return message
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [supabase, user])

  return {
    sendMessage,
  }
} 