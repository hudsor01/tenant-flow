/**
 * Error handling utilities for the frontend
 * Provides consistent error handling patterns across the application
 */

export interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

export interface ApplicationError extends Error {
  code?: string;
  type?: string;
  context?: Record<string, unknown>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  retryable?: boolean;
}

export class ErrorReporter {
  static report(error: Error, errorInfo?: ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Boundary');
      console.error('Error:', error);
      if (errorInfo) {
        console.error('Error Info:', errorInfo);
      }
      console.groupEnd();
    }

    // TODO: Send to error reporting service (Sentry, etc.)
    // This would be implemented based on the error reporting service chosen
  }

  static captureException(error: Error, context?: Record<string, unknown>) {
    const applicationError: ApplicationError = {
      ...error,
      context,
      severity: 'medium',
    };

    this.report(applicationError);
    return applicationError;
  }
}

export const handleAsyncError = (error: unknown, context?: string): ApplicationError => {
  const appError: ApplicationError = error instanceof Error 
    ? error 
    : new Error(String(error));
  
  appError.context = { ...(appError.context || {}), location: context };
  
  ErrorReporter.captureException(appError);
  return appError;
};

export const createErrorHandler = (context: string) => {
  return (error: unknown) => handleAsyncError(error, context);
};

// Hook for error handling
export function useErrorHandler() {
  return {
    handleError: handleAsyncError,
    createErrorHandler,
    reportError: ErrorReporter.report,
  };
}