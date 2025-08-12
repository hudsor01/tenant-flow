import React from 'react'

interface ErrorBoundaryWrapperState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode
  FallbackComponent: React.ComponentType<{
    error: Error
    resetErrorBoundary: () => void
  }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onReset?: () => void
}

export class ErrorBoundaryWrapper extends React.Component<
  ErrorBoundaryWrapperProps,
  ErrorBoundaryWrapperState
> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryWrapperState {
    return {
      hasError: true,
      error
    }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  resetErrorBoundary = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: undefined })
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      const { FallbackComponent } = this.props
      return (
        <FallbackComponent 
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      )
    }

    return this.props.children
  }
}