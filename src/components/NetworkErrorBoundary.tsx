import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class NetworkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log CORS and network errors specifically
    if (
      error.message.includes('CORS') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network request failed')
    ) {
      console.warn('🌐 Network/CORS Error:', error.message);
      console.warn(
        '📍 This is likely due to backend connectivity issues in development',
      );
    } else {
      console.error('💥 Uncaught error:', error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Render fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-grayscale-5">
          <div className="text-center p-loop-8 max-w-md">
            <div className="text-6xl mb-loop-4">🌐</div>
            <h2 className="text-xl font-semibold text-neutral-grayscale-90 mb-loop-2">
              Connection Issue
            </h2>
            <p className="text-neutral-grayscale-60 mb-loop-4">
              {this.state.error?.message.includes('CORS') ||
              this.state.error?.message.includes('Failed to fetch')
                ? 'Unable to connect to the backend. This may be due to network issues or server configuration.'
                : 'Something went wrong. Please try again.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-loop-6 py-loop-3 bg-brand-accent-50 text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
