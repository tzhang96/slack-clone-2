import { useSupabase } from '@/components/providers/SupabaseProvider'
import { MessageFile } from '@/types/chat'
import { FileIcon, ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FilePreviewProps {
  file: MessageFile
  onImageLoad?: () => void
}

export function FilePreview({ file, onImageLoad }: FilePreviewProps) {
  const { supabase } = useSupabase()
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const getFileUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('chat-files')
          .createSignedUrl(file.bucket_path, 3600) // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error)
          return
        }

        if (!data?.signedUrl) {
          console.error('No signed URL received')
          return
        }

        setFileUrl(data.signedUrl)
      } catch (error) {
        console.error('Error getting file URL:', error)
      }
    }

    getFileUrl()
  }, [file.bucket_path, supabase])

  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true)

    try {
      const { data, error } = await supabase.storage
        .from('chat-files')
        .download(file.bucket_path)

      if (error) {
        console.error('Error downloading file:', error)
        return
      }

      // Create a blob URL and trigger download
      const blob = new Blob([data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error handling download:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleImageLoad = () => {
    onImageLoad?.()
  }

  if (!fileUrl) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        {file.is_image ? <ImageIcon className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
        <span>{file.file_name}</span>
      </div>
    )
  }

  if (file.is_image) {
    return (
      <a 
        href={fileUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block max-w-sm hover:opacity-90 transition-opacity"
      >
        <img
          src={fileUrl}
          alt={file.file_name}
          className="rounded-lg max-h-[300px] object-contain"
          style={{
            width: file.image_width ? Math.min(file.image_width, 400) : 'auto',
            height: file.image_height ? Math.min(file.image_height, 300) : 'auto',
          }}
          onLoad={handleImageLoad}
        />
      </a>
    )
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm text-gray-700 transition-colors disabled:opacity-50"
    >
      <FileIcon className="h-5 w-5 text-gray-500" />
      <span>{file.file_name}</span>
      <span className="text-xs text-gray-500">
        ({Math.round(file.file_size / 1024)}KB)
      </span>
    </button>
  )
} 