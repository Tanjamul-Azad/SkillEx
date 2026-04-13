/**
 * ErrorBoundary
 *
 * React class-based error boundary.
 * Catches unhandled render/lifecycle errors and displays a graceful fallback
 * instead of crashing the entire application.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeFeature />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary fallback={<CustomError />} onError={logToSentry}>
 *     <SomeFeature />
 *   </ErrorBoundary>
 */

import React from 'react';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────── */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/* ── Default fallback UI ─────────────────────────────────────────── */

function DefaultFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center gap-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center'
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <h3 className="font-headline text-base font-bold text-foreground">
          Something went wrong
        </h3>
        <p className="max-w-[34ch] text-sm text-muted-foreground">
          {error?.message || 'An unexpected error occurred in this section.'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReset}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium',
            'bg-background text-foreground hover:bg-muted transition-colors'
          )}
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-xl border border-destructive/30 px-4 text-sm font-medium',
            'bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors'
          )}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

/* ── ErrorBoundary class ─────────────────────────────────────────── */

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      return (
        <DefaultFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }
    return <>{this.props.children}</>;
  }
}

/* ── withErrorBoundary HOC ─────────────────────────────────────── */

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;
  return Wrapped;
}
