import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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