import { X } from 'lucide-react'
import { Message } from '@/types/chat'
import { UserAvatar } from '../shared/UserAvatar'
import { FilePreview } from '../shared/FilePreview'

interface ThreadHeaderProps {
  parentMessage: Message
  onClose: () => void
}

export function ThreadHeader({ parentMessage, onClose }: ThreadHeaderProps) {
  return (
    <div className="border-b p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Thread</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-start gap-3">
        <UserAvatar
          userId={parentMessage.user.id}
          name={parentMessage.user.fullName}
          lastSeen={parentMessage.user.lastSeen || undefined}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-x-2">
            <span className="font-bold text-gray-900">
              {parentMessage.user.fullName}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(parentMessage.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
          {parentMessage.content && (
            <div className="text-gray-900 whitespace-pre-wrap break-words">
              {parentMessage.content}
            </div>
          )}
          {parentMessage.file && (
            <div className="mt-2">
              <FilePreview file={parentMessage.file} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 