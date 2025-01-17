'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { Message } from '@/types/chat'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'

interface ThreadPreviewProps {
  replyCount: number
  messageId: string
  participants: Array<{
    id: string
    username: string
    fullName: string
    lastSeen?: string
  }>
  onClick: () => void
}

export function ThreadPreview({
  replyCount: initialReplyCount,
  messageId,
  participants,
  onClick,
}: ThreadPreviewProps) {
  const { supabase } = useSupabase()
  const [replyCount, setReplyCount] = useState(initialReplyCount)
  const [mounted, setMounted] = useState(false)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Update local state when prop changes
    setReplyCount(initialReplyCount)
  }, [initialReplyCount])

  useEffect(() => {
    if (!mounted) return

    // Subscribe to parent message updates
    const channel = supabase
      .channel(`thread-preview-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `id=eq.${messageId}`
        },
        (payload) => {
          if (payload.new.reply_count !== undefined) {
            setReplyCount(payload.new.reply_count)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [messageId, supabase, mounted])

  if (!mounted) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm py-1 px-2 rounded hover:bg-gray-100"
      >
        <MessageCircle className="w-4 h-4" />
        <span>{replyCount} replies</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm py-1 px-2 rounded hover:bg-gray-100"
    >
      <MessageCircle className="w-4 h-4" />
      <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
      {participants.length > 0 && (
        <span className="text-xs text-gray-500">
          • {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
        </span>
      )}
    </button>
  )
} 