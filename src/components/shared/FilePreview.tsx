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
        console.log('Getting signed URL for file:', {
          bucketPath: file.bucketPath,
          fileName: file.fileName,
          isImage: file.isImage
        })

        if (!file.bucketPath) {
          console.error('No bucket path provided for file:', file)
          return
        }

        const { data, error } = await supabase.storage
          .from('chat-files')
          .createSignedUrl(file.bucketPath, 3600) // 1 hour expiry

        console.log('Signed URL result:', {
          data,
          error,
          signedUrl: data?.signedUrl
        })

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

    if (file.bucketPath) {
      getFileUrl()
    }
  }, [file.bucketPath, supabase])

  const handleDownload = async () => {
    if (isDownloading || !file.bucketPath) return
    setIsDownloading(true)

    try {
      const { data, error } = await supabase.storage
        .from('chat-files')
        .download(file.bucketPath)

      if (error) {
        console.error('Error downloading file:', error)
        return
      }

      // Create a blob URL and trigger download
      const blob = new Blob([data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
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
        {file.isImage ? <ImageIcon className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
        <span>{file.fileName}</span>
      </div>
    )
  }

  if (file.isImage) {
    return (
      <a 
        href={fileUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block max-w-sm hover:opacity-90 transition-opacity"
      >
        <img
          src={fileUrl}
          alt={file.fileName}
          className="rounded-lg max-h-[300px] object-contain"
          style={{
            width: file.imageWidth ? Math.min(file.imageWidth, 400) : 'auto',
            height: file.imageHeight ? Math.min(file.imageHeight, 300) : 'auto',
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
      <span>{file.fileName}</span>
      <span className="text-xs text-gray-500">
        ({Math.round(file.fileSize / 1024)}KB)
      </span>
    </button>
  )
} 