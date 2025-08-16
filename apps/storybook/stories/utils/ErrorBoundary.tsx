import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class StoryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Storybook Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <h3 className="text-red-800 font-semibold mb-2">Story Error</h3>
            <p className="text-red-700 text-sm mb-2">
              This component failed to render. This might be due to:
            </p>
            <ul className="text-red-600 text-xs list-disc list-inside space-y-1">
              <li>Missing imports or dependencies</li>
              <li>Invalid props or missing required props</li>
              <li>Component requiring authentication or API context</li>
            </ul>
            {this.state.error && (
              <details className="mt-3">
                <summary className="text-red-800 text-xs cursor-pointer">Error Details</summary>
                <pre className="text-red-600 text-xs mt-1 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}