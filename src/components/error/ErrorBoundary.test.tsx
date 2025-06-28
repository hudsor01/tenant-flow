import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { ErrorBoundary, PageErrorBoundary } from './ErrorBoundary'

// Mock console.error to avoid noise in tests
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    )
  })

  it('resets error when Try Again button is clicked', () => {
    let shouldThrow = true
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />
    
    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )
    
    // Error boundary shows
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    
    // Update component to not throw, then click reset
    shouldThrow = false
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )
    
    fireEvent.click(screen.getByText('Try Again'))
    
    // Should show the component content now
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('shows error details in development mode', () => {
    // Mock development environment
    vi.stubEnv('DEV', true)
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/Error:.*Test error/)).toBeInTheDocument()
    expect(screen.getByText('Stack trace')).toBeInTheDocument()
  })

  it('uses custom fallback component when provided', () => {
    const CustomFallback = ({ error }: { error: Error }) => (
      <div>Custom error: {error.message}</div>
    )
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument()
  })
})

describe('PageErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <PageErrorBoundary>
        <div>Page content</div>
      </PageErrorBoundary>
    )
    
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('renders page-specific error fallback when error occurs', () => {
    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    )
    
    expect(screen.getByText('Page Error')).toBeInTheDocument()
    expect(screen.getByText(/This page encountered an error/)).toBeInTheDocument()
    expect(screen.getByText('Reload Page')).toBeInTheDocument()
  })

  it('logs page-specific error information', () => {
    const consoleSpy = vi.spyOn(console, 'error')
    
    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    )
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Page Error:',
      expect.objectContaining({
        url: expect.any(String),
        error: 'Test error',
        stack: expect.any(String),
        componentStack: expect.any(String)
      })
    )
  })
})