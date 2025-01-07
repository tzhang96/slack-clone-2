'use client'

import { useAuth } from '@/lib/auth'
import { VariableSizeList, ListChildComponentProps, areEqual } from 'react-window'
import { useRef, useEffect, memo, useState } from 'react'
import { Message, MessageRowData } from '@/types/chat'

interface MessageListProps {
  messages: Message[]
}

const MessageRow = memo(({ data, index, style }: ListChildComponentProps<MessageRowData>) => {
  const { messages, currentUserId } = data
  const message = messages[index]
  const messageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messageRef.current) {
      const height = messageRef.current.getBoundingClientRect().height
      data.setSize(index, height + 4)
    }
  }, [message.content, index, data])

  return (
    <div style={style}>
      <div className="py-[2px]">
        <div ref={messageRef} className="px-6 py-1 hover:bg-gray-100 transition-colors duration-100">
          <div className="flex items-start gap-x-2">
            <div className="w-9 h-9 rounded bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 text-sm font-medium uppercase">
              {message.user.fullName.charAt(0)}
            </div>
            
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-baseline gap-x-2">
                <span className="font-bold text-gray-900">
                  {message.user.fullName}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.createdAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
              <div className="text-gray-900 whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}, areEqual)

export function MessageList({ messages }: MessageListProps) {
  const { user } = useAuth()
  const listRef = useRef<VariableSizeList>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeMap = useRef<{[key: number]: number}>({})
  const [containerHeight, setContainerHeight] = useState(0)

  // Update container height when window resizes
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const getSize = (index: number) => {
    return sizeMap.current[index] || 88 // Default height
  }

  const setSize = (index: number, size: number) => {
    if (sizeMap.current[index] !== size) {
      sizeMap.current[index] = size
      if (listRef.current) {
        listRef.current.resetAfterIndex(index)
      }
    }
  }

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      // Initial scroll
      listRef.current.scrollToItem(messages.length - 1, 'end')
      
      // Second scroll after a small delay to ensure message is fully visible
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollToItem(messages.length - 1, 'end')
        }
      }, 100)
    }
  }, [messages.length])

  return (
    <div ref={containerRef} className="h-full">
      {/* @ts-ignore */}
      <VariableSizeList<MessageRowData>
        ref={listRef}
        height={containerHeight}
        width="100%"
        itemCount={messages.length}
        itemSize={getSize}
        itemData={{
          messages,
          currentUserId: user?.id,
          setSize
        }}
      >
        {/* @ts-ignore */}
        {MessageRow}
      </VariableSizeList>
    </div>
  )
} 