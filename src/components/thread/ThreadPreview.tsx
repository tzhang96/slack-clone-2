import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Reply } from 'lucide-react'
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

  useEffect(() => {
    // Update local state when prop changes
    setReplyCount(initialReplyCount)
  }, [initialReplyCount])

  useEffect(() => {
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
  }, [messageId, supabase])

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm py-1 px-2 rounded hover:bg-gray-100"
    >
      <Reply className="w-4 h-4" />
      <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
    </button>
  )
} 