export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading...</p>
    </div>
  )
} 