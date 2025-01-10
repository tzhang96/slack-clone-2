import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { useCallback, useState } from 'react'

interface FileMetadata {
  bucket_path: string
  file_name: string
  file_size: number
  content_type: string
  is_image: boolean
  image_width?: number
  image_height?: number
}

export function useFileUpload() {
  const supabase = createClientComponentClient<Database>()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const uploadFile = useCallback(async (file: File): Promise<FileMetadata> => {
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
      let imageWidth: number | undefined
      let imageHeight: number | undefined
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
        ...(isImage && {
          image_width: imageWidth,
          image_height: imageHeight,
        }),
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(err as Error)
      throw err
    } finally {
      setIsUploading(false)
    }
  }, [supabase])

  return {
    uploadFile,
    isUploading,
    error,
  }
} 