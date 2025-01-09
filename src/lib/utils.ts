import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Combines class names and merges Tailwind classes properly
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 