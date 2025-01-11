import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { Message } from '@/types/chat'
import { UserTooltip } from '../shared/UserTooltip'
import { UserAvatar } from '../shared/UserAvatar'

interface ThreadPreviewProps {
  replyCount: number
  latestReply?: Message
  participants: Array<{
    id: string
    username: string
    fullName: string
    lastSeen?: string
  }>
  onClick: () => void
}

export function ThreadPreview({
  replyCount,
  participants,
  onClick,
}: ThreadPreviewProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm py-1 px-2 rounded hover:bg-gray-100"
    >
      <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
      <div className="flex items-center">
        <div className="flex -space-x-1">
          {participants.slice(0, 3).map((participant) => (
            <UserAvatar
              key={participant.id}
              userId={participant.id}
              name={participant.fullName}
              size="xs"
              className="border-[1.5px] border-gray-200 dark:border-gray-700"
              showStatus={false}
            />
          ))}
          {participants.length > 3 && (
            <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 border-[1.5px] border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-500">
              +{participants.length - 3}
            </div>
          )}
        </div>
      </div>
    </button>
  )
} 