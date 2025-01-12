import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export interface FileMetadata {
  bucket_path: string
  file_name: string
  file_size: number
  content_type: string
  is_image: boolean
  image_width: number | null
  image_height: number | null
}

interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<FileMetadata | null>
  isUploading: boolean
  error: Error | null
}

export function useFileUpload(): UseFileUploadReturn {
  const { supabase } = useSupabase()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const uploadFile = async (file: File): Promise<FileMetadata | null> => {
    setIsUploading(true)
    setError(null)

    try {
      // Generate a unique file path
      const timestamp = new Date().getTime()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileName = `${timestamp}-${randomString}-${file.name}`
      const bucketPath = `uploads/${fileName}`

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(bucketPath, file)

      if (uploadError) throw uploadError

      // Get image dimensions if it's an image
      let imageWidth: number | null = null
      let imageHeight: number | null = null
      const isImage = file.type.startsWith('image/')

      if (isImage) {
        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = () => {
            imageWidth = img.width
            imageHeight = img.height
            resolve(null)
          }
          img.onerror = reject
          img.src = URL.createObjectURL(file)
        })
      }

      // Return file metadata
      return {
        bucket_path: bucketPath,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        is_image: isImage,
        image_width: imageWidth,
        image_height: imageHeight,
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(err as Error)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadFile,
    isUploading,
    error
  }
} 