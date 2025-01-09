'use client'

import { UserStatus } from '@/types/presence'
import { cn } from '@/lib/utils'

interface StatusIndicatorProps {
  status: UserStatus
  className?: string
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  return (
    <div
      className={cn(
        'w-2.5 h-2.5 rounded-full',
        {
          'bg-green-500': status === 'online',
          'bg-yellow-500': status === 'away',
          'bg-gray-400': status === 'offline'
        },
        className
      )}
      aria-label={`Status: ${status}`}
    />
  )
} 