'use client';
import React from 'react';

import { useDict } from '../../../lib/oneentry/labels/DictContext';
import { ERROR_BOUNDARY_LABELS } from '../../data/commonLabels';

/**
 * The default fallback UI.
 *
 * Split out of the class because the copy comes from the CMS dictionary and a
 * class component cannot call `useDict`. The boundary itself has to stay a
 * class — `getDerivedStateFromError` has no hook equivalent.
 *
 * @param          props         - Fallback props.
 * @param          [props.message] - The caught error's message.
 * @param      props.onRetry - Clears the error state.
 * @returns               The rendered fallback.
 */
function ErrorFallback({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const L = useDict('error_boundary_', ERROR_BOUNDARY_LABELS);
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center font-[Inter,sans-serif]">
      <div className="flex size-16 items-center justify-center border-2 border-[#fecaca] bg-[#fef2f2] text-2xl">✕</div>
      <h2 className="text-lg font-bold tracking-widest uppercase" data-testid="error-boundary-heading">
        {L.heading}
      </h2>
      <p className="max-w-xs text-sm leading-relaxed text-gray-400">{message ?? L.unexpectedError}</p>
      <button
        onClick={onRetry}
        className="rounded-none bg-black px-6 py-3 text-xs font-bold tracking-[0.2em] text-white uppercase"
      >
        {L.tryAgain}
      </button>
    </div>
  );
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallback
          message={this.state.error?.message}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }
    return this.props.children;
  }
}
