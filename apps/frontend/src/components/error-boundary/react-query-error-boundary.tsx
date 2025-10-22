import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ReactQueryErrorBoundaryProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  description?: string;
  showResetButton?: boolean;
  onRetry?: () => void;
 children?: React.ReactNode;
}

export const ReactQueryErrorBoundary: React.FC<ReactQueryErrorBoundaryProps> = ({
  error,
  resetError,
  title = 'Something went wrong',
  description = 'An error occurred while loading the data. Please try again.',
  showResetButton = true,
  onRetry}) => {
  const handleReset = () => {
    if (onRetry) {
      onRetry();
    } else if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md w-full">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{description}</p>
            {error?.message && (
              <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                {error.message}
              </p>
            )}
            {showResetButton && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
 );
};

// Higher-order component for wrapping React Query components
export const withReactQueryErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const WrappedComponent = (props: P) => {
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <ReactQueryErrorBoundary>
          <Component {...props} />
        </ReactQueryErrorBoundary>
      </React.Suspense>
    );
  };
  WrappedComponent.displayName = `withReactQueryErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

// Hook for handling React Query errors in components
export const useReactQueryErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null
  };
};

// Error boundary specifically for form mutations
interface FormMutationErrorBoundaryProps {
  error?: Error;
  onRetry?: () => void;
  onBack?: () => void;
  errorType?: 'validation' | 'submission' | 'network' | 'unknown';
  children?: React.ReactNode;
}

export const FormMutationErrorBoundary: React.FC<FormMutationErrorBoundaryProps> = ({
  error,
  onRetry,
  onBack,
  errorType = 'unknown'
}) => {
  const getErrorTitle = () => {
    switch (errorType) {
      case 'validation':
        return 'Validation Error';
      case 'submission':
        return 'Submission Failed';
      case 'network':
        return 'Network Error';
      default:
        return 'Something went wrong';
    }
  };

  const getErrorDescription = () => {
    switch (errorType) {
      case 'validation':
        return 'Please check your input and try again.';
      case 'submission':
        return 'Your request could not be processed. Please try again.';
      case 'network':
        return 'Unable to connect to the server. Please check your connection.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md w-full">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{getErrorTitle()}</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{getErrorDescription()}</p>
            {error?.message && (
              <p className="text-sm text-muted-foreground">
                {error.message}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              {onBack && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                >
                  Go Back
                </Button>
              )}
              {onRetry && (
                <Button
                  size="sm"
                  onClick={onRetry}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
