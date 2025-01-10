import { UserAvatar } from '@/components/shared/UserAvatar'
import { DMUser } from '@/types/dm'

interface DMHeaderProps {
  otherUser: DMUser | null
}

export function DMHeader({ otherUser }: DMHeaderProps) {
  if (!otherUser) return null

  return (
    <div className="flex items-center px-6 py-4 border-b gap-3">
      <UserAvatar 
        userId={otherUser.id}
        name={otherUser.full_name}
        showStatus
        lastSeen={otherUser.last_seen}
      />
      <div>
        <h1 className="font-semibold">{otherUser.full_name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">@{otherUser.username}</p>
      </div>
    </div>
  )
} 