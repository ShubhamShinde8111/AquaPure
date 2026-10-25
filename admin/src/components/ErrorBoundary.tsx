/**
 * AquaPure Admin — React Error Boundary
 * Catches runtime errors in route components and provides a graceful recovery UI.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="card"
          style={{
            margin: '40px auto',
            maxWidth: 600,
            padding: 32,
            textAlign: 'center',
            border: '1px solid var(--color-error)',
            background: 'var(--color-surface, #fff)',
            borderRadius: 16,
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            {this.props.fallbackTitle || 'Unable to Display This Screen'}
          </h2>

          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: '0 0 20px' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering the data.'}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={this.handleReset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 auto' }}
          >
            <RefreshCw size={16} /> Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
