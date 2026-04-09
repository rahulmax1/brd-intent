'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>

              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>

              <p className="text-sm text-gray-600 mb-6">
                An unexpected error occurred. We've logged the issue and will look into it.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-left">
                  <p className="text-xs font-mono text-red-800 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </button>

                <a
                  href="/projects"
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
