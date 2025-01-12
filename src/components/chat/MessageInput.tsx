'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, X } from 'lucide-react'
import { useFileUpload, FileMetadata } from '@/hooks/useFileUpload'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (content: string, file: FileMetadata | null) => void | Promise<void>
  context?: 'channel' | 'dm' | 'thread'
  placeholder?: string
  disabled?: boolean
}

const MAX_LENGTH = 4000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

// Helper function to count Unicode characters correctly
const getUnicodeLength = (str: string) => {
  return Array.from(str).length
}

export function MessageInput({ 
  onSend, 
  context = 'channel',
  placeholder = 'Type a message...',
  disabled = false 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [fileState, setFileState] = useState<{ file: File | null }>({ file: null })
  const { uploadFile, isUploading, error: uploadError } = useFileUpload()
  const [showValidationError, setShowValidationError] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset validation error when message changes
  useEffect(() => {
    if (message.trim()) {
      setShowValidationError(false)
    }
  }, [message])

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const contentHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = contentHeight + 'px'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMessage = message.trim()

    // Show validation error if trying to send file without message
    if (!trimmedMessage && fileState.file) {
      setShowValidationError(true)
      return
    }

    try {
      let fileMetadata: FileMetadata | null = null
      
      // Upload file if present
      if (fileState.file) {
        fileMetadata = await uploadFile(fileState.file)
      }

      // Send message with optional file metadata
      if (trimmedMessage && !disabled) {
        onSend(trimmedMessage, fileMetadata)
        setMessage('')
        setFileState({ file: null })
        setShowValidationError(false)
      }
    } catch (error) {
      console.error('Error handling submit:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const unicodeLength = getUnicodeLength(newValue)
    if (unicodeLength <= MAX_LENGTH) {
      setMessage(newValue)
      // Adjust height after value change
      adjustTextareaHeight()
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit'
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'File type not supported'
    }
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large')
      return
    }

    setFileState({ file })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large')
      return
    }

    setFileState({ file })
  }

  // Adjust height on initial render
  useEffect(() => {
    adjustTextareaHeight()
  }, [])

  // Update uploading state from the hook
  useEffect(() => {
    setFileState(prev => ({
      ...prev,
      uploading: isUploading
    }))
  }, [isUploading])

  const remainingChars = MAX_LENGTH - getUnicodeLength(message)
  const isNearLimit = remainingChars <= 100

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {fileState.file && (
        <div className={cn(
          "mb-2 px-3 py-2 bg-gray-50 border rounded-md inline-flex items-center gap-2 max-w-full",
          showValidationError && "border-red-500 bg-red-50"
        )}>
          <span className="truncate text-sm">{fileState.file.name}</span>
          <button
            type="button"
            onClick={() => setFileState({ file: null })}
            className="p-1 hover:bg-gray-200 rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <div className="flex-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || disabled}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={disabled}
              className={cn(
                "w-full resize-none rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 pr-10 min-h-[2.5rem] max-h-[10rem] py-2 px-3",
                showValidationError && "border-red-500 focus:border-red-500 focus:ring-red-500"
              )}
              rows={1}
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || disabled || !message.trim()}
            className="p-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        
        {showValidationError && (
          <p className="mt-1 text-sm text-red-500">
            Please add a message to send with your file
          </p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />

      {uploadError && (
        <p className="mt-2 text-sm text-red-500">
          Error uploading file: {uploadError.message}
        </p>
      )}
    </form>
  )
} 