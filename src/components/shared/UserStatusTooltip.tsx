'use client'

import { useRef, useState } from 'react'
import { usePresenceContext } from '@/components/providers/PresenceProvider'
import { formatDistanceToNow } from 'date-fns'
import { StatusIndicator } from '@/components/presence/StatusIndicator'

interface UserStatusTooltipProps {
  userId: string
  name: string
  lastSeen: string
  children: React.ReactNode
}

export function UserStatusTooltip({ userId, name, lastSeen, children }: UserStatusTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { userStatuses } = usePresenceContext()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const status = userStatuses[userId] || 'offline'

  // Close tooltip when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  // Add/remove click listener
  const handleClick = () => {
    if (!isOpen) {
      document.addEventListener('click', handleClickOutside)
    } else {
      document.removeEventListener('click', handleClickOutside)
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative" ref={tooltipRef}>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
      {isOpen && (
        <div className="absolute z-50 left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="p-3">
            <div className="font-medium text-gray-900">{name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <StatusIndicator status={status} className="w-2 h-2" />
              <span className="capitalize">{status}</span>
            </div>
            {status === 'offline' && (
              <div className="mt-1 text-xs text-gray-400">
                Last seen {formatDistanceToNow(new Date(lastSeen))} ago
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 