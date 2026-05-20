import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Uncaught error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="glass-strong p-8 rounded-2xl max-w-md w-full text-center space-y-6 border border-danger/20 shadow-2xl">
            <div className="w-16 h-16 bg-danger-subtle rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-danger" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-text-primary">Something went wrong</h2>
              <p className="text-text-secondary text-sm">
                An unexpected error occurred. We've been notified and are looking into it.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-bg-primary/50 p-3 rounded-lg text-left overflow-auto max-h-32">
                <code className="text-xs text-danger font-mono break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <Button
              variant="primary"
              className="w-full"
              onClick={this.handleReset}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
