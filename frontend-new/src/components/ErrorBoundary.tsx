import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-6 bg-red-50 dark:bg-red-900 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-4">
            Something went wrong
          </h2>
          <div className="mb-4">
            <p className="text-red-600 dark:text-red-200">
              {this.state.error?.toString()}
            </p>
          </div>
          <details className="mt-4 p-4 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700">
            <summary className="font-medium text-red-600 dark:text-red-300 cursor-pointer">
              Error Details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 overflow-auto max-h-96">
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 