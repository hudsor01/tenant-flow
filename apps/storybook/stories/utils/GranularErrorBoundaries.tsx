import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Bug, Home } from 'lucide-react';

// Base error boundary types
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// Enhanced error boundary with detailed error reporting
class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { 
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ 
      error, 
      errorInfo,
      errorId: Math.random().toString(36).substr(2, 9)
    });
    
    // Log error for debugging
    console.group(`🚨 Storybook Error Boundary [${this.state.errorId}]`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToSentry(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return this.renderDefaultErrorUI();
    }

    return this.props.children;
  }

  private renderDefaultErrorUI() {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50 max-w-2xl mx-auto">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Component Error Detected
            </h3>
            <p className="text-red-700 mb-4">
              This component encountered an error and could not render properly.
            </p>
            
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-red-800 hover:text-red-900">
                Error Details (ID: {this.state.errorId})
              </summary>
              <div className="mt-2 p-3 bg-white rounded border text-sm">
                <p className="font-medium text-gray-800 mb-1">Error Message:</p>
                <p className="text-red-600 mb-3 font-mono text-xs">
                  {this.state.error?.message}
                </p>
                
                {this.state.error?.stack && (
                  <>
                    <p className="font-medium text-gray-800 mb-1">Stack Trace:</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32 text-gray-600">
                      {this.state.error.stack}
                    </pre>
                  </>
                )}
              </div>
            </details>

            <div className="flex gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Component
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                <Home className="h-4 w-4" />
                Reload Storybook
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// Specialized error boundaries for different component types

// For UI components (buttons, inputs, etc.)
export class UIComponentErrorBoundary extends BaseErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('🎨 UI Component Error');
    console.error('UI Component failed to render:', error.message);
    console.error('This is likely a props or styling issue');
    console.groupEnd();
    super.componentDidCatch(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-orange-200 rounded bg-orange-50 text-center">
          <Bug className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <p className="text-orange-800 font-medium">UI Component Error</p>
          <p className="text-orange-700 text-sm">Check component props and styling</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// For business logic components (property cards, tenant forms, etc.)
export class BusinessComponentErrorBoundary extends BaseErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('🏢 Business Component Error');
    console.error('Business component failed:', error.message);
    console.error('This may be due to data formatting or business logic issues');
    console.groupEnd();
    super.componentDidCatch(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-blue-200 rounded bg-blue-50 text-center">
          <AlertCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-blue-800 font-medium">Business Component Error</p>
          <p className="text-blue-700 text-sm">Check data props and business logic</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// For form components with validation
export class FormComponentErrorBoundary extends BaseErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('📝 Form Component Error');
    console.error('Form component failed:', error.message);
    console.error('This may be due to validation rules or form state issues');
    console.groupEnd();
    super.componentDidCatch(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-purple-200 rounded bg-purple-50 text-center">
          <AlertCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="text-purple-800 font-medium">Form Component Error</p>
          <p className="text-purple-700 text-sm">Check validation rules and form state</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// For data visualization components (charts, graphs, etc.)
export class DataVisualizationErrorBoundary extends BaseErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('📊 Data Visualization Error');
    console.error('Data visualization failed:', error.message);
    console.error('This may be due to invalid data format or missing dependencies');
    console.groupEnd();
    super.componentDidCatch(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-green-200 rounded bg-green-50 text-center">
          <AlertCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-medium">Data Visualization Error</p>
          <p className="text-green-700 text-sm">Check data format and chart configuration</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// For layout components (grids, containers, etc.)
export class LayoutErrorBoundary extends BaseErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('🏗️ Layout Component Error');
    console.error('Layout component failed:', error.message);
    console.error('This may be due to CSS grid/flexbox issues or responsive breakpoints');
    console.groupEnd();
    super.componentDidCatch(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-indigo-200 rounded bg-indigo-50 text-center">
          <AlertCircle className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
          <p className="text-indigo-800 font-medium">Layout Component Error</p>
          <p className="text-indigo-700 text-sm">Check CSS layout and responsive design</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  BoundaryType: typeof BaseErrorBoundary = BaseErrorBoundary
) {
  const WrappedComponent = (props: P) => (
    <BoundaryType>
      <Component {...props} />
    </BoundaryType>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting in functional components
export function useErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: string) => {
    console.group(`🐛 Manual Error Report${context ? ` - ${context}` : ''}`);
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.groupEnd();
    
    // Send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: reportToErrorService(error, context);
    }
  }, []);

  return { reportError };
}

// Story decorator that automatically applies appropriate error boundary
export const withStoryErrorBoundary = (BoundaryType: typeof BaseErrorBoundary = BaseErrorBoundary) => 
  (Story: React.ComponentType) => (
    <BoundaryType>
      <Story />
    </BoundaryType>
  );

export { BaseErrorBoundary as StoryErrorBoundary };