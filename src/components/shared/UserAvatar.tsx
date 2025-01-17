'use client'

import { usePresenceContext } from '@/components/providers/PresenceProvider'
import { StatusIndicator } from '@/components/presence/StatusIndicator'
import { UserTooltip } from '@/components/shared/UserTooltip'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  userId: string
  name: string
  className?: string
  showStatus?: boolean
  lastSeen?: string | null
  size?: 'xs' | 'sm' | 'md'
  isBot?: boolean
}

function getInitials(name: string): string {
  if (!name) return ''
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserAvatar({ 
  userId, 
  name, 
  className, 
  showStatus = true, 
  lastSeen,
  size = 'md',
  isBot = false
}: UserAvatarProps) {
  const { userStatuses } = usePresenceContext()
  const status = isBot ? 'online' : (userStatuses[userId] || 'offline')
  const initials = getInitials(name)
  
  if (!initials) return null

  const avatar = (
    <div className="relative">
      <div
        className={cn(
          'rounded bg-gray-200 flex items-center justify-center text-gray-500 font-medium uppercase',
          {
            'w-9 h-9 text-sm': size === 'md',
            'w-7 h-7 text-xs': size === 'sm',
            'w-4 h-4 text-[8px]': size === 'xs'
          },
          className
        )}
      >
        {initials}
      </div>
      {showStatus && (
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-gray-900 rounded-full',
          size === 'sm' && 'scale-75 -bottom-1 -right-1',
          size === 'xs' && 'scale-50 -bottom-1 -right-1'
        )}>
          <StatusIndicator status={status} />
        </div>
      )}
    </div>
  )

  if (!lastSeen) {
    return avatar
  }

  return (
    <UserTooltip userId={userId} name={name} lastSeen={lastSeen} isBot={isBot}>
      {avatar}
    </UserTooltip>
  )
} 