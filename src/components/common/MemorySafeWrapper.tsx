import React, { Component, ReactNode, ErrorInfo } from 'react';
import { memoryMonitor } from '@/utils/memoryMonitor';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Memory-safe wrapper component with error boundaries and memory monitoring
 */
export class MemorySafeWrapper extends Component<Props, State> {
  private memoryCheckInterval: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MemorySafeWrapper caught an error:', error, errorInfo);
    
    // Log memory usage when error occurs
    const memoryUsage = memoryMonitor.getCurrentMemoryUsage();
    if (memoryUsage) {
      console.error('Memory usage at error time:', memoryUsage);
    }

    this.props.onError?.(error, errorInfo);
  }

  componentDidMount() {
    // DISABLED: Memory monitoring was causing high CPU usage and overheating
    // if (process.env.NODE_ENV === 'development') {
    //   this.memoryCheckInterval = setInterval(() => {
    //     const usage = memoryMonitor.getCurrentMemoryUsage();
    //     if (usage && usage.used > 200) { // Warn if over 200MB
    //       console.warn(`Component memory usage: ${usage.used}MB`);
    //     }
    //   }, 30000); // Check every 30 seconds
    // }
  }

  componentWillUnmount() {
    // Clean up interval
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-red-50">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-red-700 mb-4">
              An error occurred while rendering this component.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-red-600 font-medium">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-2 bg-red-100 text-red-800 text-sm overflow-auto">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with memory safety
 */
export function withMemorySafety<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const MemorySafeComponent = (props: P) => (
    <MemorySafeWrapper fallback={fallback}>
      <WrappedComponent {...props} />
    </MemorySafeWrapper>
  );

  MemorySafeComponent.displayName = `MemorySafe(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return MemorySafeComponent;
}
