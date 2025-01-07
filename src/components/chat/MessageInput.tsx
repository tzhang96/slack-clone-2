'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

interface MessageInputProps {
    onSend: (content: string) => void
    disabled?: boolean
  }

const MAX_LENGTH = 4000

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMessage = message.trim()
    
    if (trimmedMessage && !disabled) {
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
    if (newValue.length <= MAX_LENGTH) {
      setMessage(newValue)
      adjustTextareaHeight()
    }
  }

  // Adjust height on initial render and when message changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [message])

  const remainingChars = MAX_LENGTH - message.length
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
            className={`flex-1 resize-none rounded-md border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] max-h-[200px] ${
              isNearLimit ? 'border-yellow-500' : 'border-gray-300'
            }`}
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