'use client'

import { usePresenceContext } from '@/components/providers/PresenceProvider'
import { StatusIndicator } from '@/components/presence/StatusIndicator'
import { UserStatusTooltip } from '@/components/shared/UserStatusTooltip'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  userId: string
  name: string
  className?: string
  showStatus?: boolean
  lastSeen?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserAvatar({ userId, name, className, showStatus = true, lastSeen }: UserAvatarProps) {
  const { userStatuses } = usePresenceContext()
  const status = userStatuses[userId] || 'offline'
  
  const avatar = (
    <div className="relative">
      <div
        className={cn(
          'w-9 h-9 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium uppercase',
          className
        )}
      >
        {getInitials(name)}
      </div>
      {showStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white rounded-full">
          <StatusIndicator status={status} />
        </div>
      )}
    </div>
  )

  if (!lastSeen) {
    return avatar
  }

  return (
    <UserStatusTooltip userId={userId} name={name} lastSeen={lastSeen}>
      {avatar}
    </UserStatusTooltip>
  )
} 