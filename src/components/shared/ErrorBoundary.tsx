import React from 'react'

interface Props {
  fallback?: React.ReactNode
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          <h3 className="font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm">{this.state.error?.message}</p>
        </div>
      )
    }

    return this.props.children
  }
} 