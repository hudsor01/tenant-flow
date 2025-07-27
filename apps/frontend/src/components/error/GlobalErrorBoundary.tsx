import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface ErrorBoundaryProps {
    children: ReactNode;
}

class ErrorBoundaryComponent extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    override render() {
        if (this.state.hasError) {
            return <GlobalErrorBoundary error={this.state.error} />;
        }

        return this.props.children;
    }
}

interface GlobalErrorBoundaryProps {
    error?: Error;
}

export function GlobalErrorBoundary({ error }: GlobalErrorBoundaryProps) {
    const errorMessage = error?.message || 'An unexpected error occurred';
    const errorStack = error?.stack && import.meta.env.DEV ? error.stack : undefined;

    const handleReload = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 md:p-12">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                        <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
                    </div>
                    
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Oops! Something went wrong
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md">
                            {errorMessage}
                        </p>
                    </div>

                    {errorStack && (
                        <details className="w-full">
                            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                                Show error details
                            </summary>
                            <pre className="mt-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs text-left overflow-x-auto">
                                {errorStack}
                            </pre>
                        </details>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button
                            onClick={handleReload}
                            variant="default"
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                        <Button
                            onClick={handleGoHome}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Go to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Export the class component as the main error boundary
export default ErrorBoundaryComponent;