'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Something went wrong!
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
} 