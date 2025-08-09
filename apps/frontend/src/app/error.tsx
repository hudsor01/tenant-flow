'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to your error reporting service
    logger.error('Application error:', error);
    
    // You can send this to your error tracking service
    if (typeof window !== 'undefined') {
      // Example: Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
            <p className="text-gray-600">
              We encountered an unexpected error. This has been logged and we&apos;ll look into it.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="text-left bg-gray-100 p-4 rounded-lg">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>

        {error.digest && (
          <div className="text-xs text-gray-500">
            Error ID: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}