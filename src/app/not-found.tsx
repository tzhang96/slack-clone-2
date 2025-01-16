import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Page Not Found
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
} 