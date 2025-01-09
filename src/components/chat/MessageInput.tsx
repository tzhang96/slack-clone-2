'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

interface MessageInputProps {
    onSend: (content: string) => void
    disabled?: boolean
  }

const MAX_LENGTH = 4000

// Helper function to count Unicode characters correctly
const getUnicodeLength = (str: string) => {
  return Array.from(str).length
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const contentHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = contentHeight + 'px'
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMessage = message.trim()
    
    if (trimmedMessage && !disabled && getUnicodeLength(trimmedMessage) <= MAX_LENGTH) {
      onSend(trimmedMessage)
      setMessage('')
      // Reset height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
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

  // Adjust height on initial render
  useEffect(() => {
    adjustTextareaHeight()
  }, [])

  const remainingChars = MAX_LENGTH - getUnicodeLength(message)
  const isNearLimit = remainingChars <= 100

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className={`flex-1 resize-none rounded-md border px-3 py-1.5 text-base leading-6 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              isNearLimit ? 'border-yellow-500' : 'border-gray-300'
            } scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400`}
            style={{ maxHeight: '200px', overflowY: message.includes('\n') ? 'auto' : 'hidden' }}
            maxLength={MAX_LENGTH}
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-2 rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </button>
        </div>
        {isNearLimit && (
          <div className={`text-sm ${remainingChars === 0 ? 'text-red-500' : 'text-yellow-600'}`}>
            {remainingChars === 0 
              ? 'Message length limit reached'
              : `${remainingChars} characters remaining`}
          </div>
        )}
      </div>
    </form>
  )
} 