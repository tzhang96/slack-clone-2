interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          animate-spin rounded-full border-b-blue-500
          ${sizeClasses[size]}
          border-gray-200
        `}
      />
    </div>
  )
}

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingState({ message, size = 'md', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <LoadingSpinner size={size} />
      {message && (
        <p className="text-gray-500 text-sm">{message}</p>
      )}
    </div>
  )
} 