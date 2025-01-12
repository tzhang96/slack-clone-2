import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { UserJoinResult } from '@/types/chat'

// Combines class names and merges Tailwind classes properly
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Creates a debounced version of a function that only executes after waiting for a specified delay
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const callNow = immediate && !timeout

    const later = () => {
      timeout = null
      if (!immediate) {
        func(...args)
      }
    }

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)

    if (callNow) {
      func(...args)
    }
  }
}

export function isValidUserData(user: any): user is UserJoinResult {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.username === 'string' &&
    typeof user.full_name === 'string'
  )
}

export function transformUserData(userInfo: UserJoinResult | null | undefined, fallbackId?: string) {
  if (!userInfo) {
    return {
      id: fallbackId || 'unknown',
      username: 'Unknown',
      fullName: 'Unknown User',
      lastSeen: null,
      status: 'offline'
    }
  }

  return {
    id: userInfo.id,
    username: userInfo.username,
    fullName: userInfo.full_name,
    lastSeen: userInfo.last_seen,
    status: userInfo.status || 'offline'
  }
} 