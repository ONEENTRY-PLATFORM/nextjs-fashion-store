'use client'
import React from 'react';
import { ERROR_BOUNDARY_LABELS as L } from '../data/commonLabels';

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
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4 text-center font-[Inter,sans-serif]">
          <div className="w-16 h-16 flex items-center justify-center text-2xl bg-[#fef2f2] border-2 border-[#fecaca]">
            ✕
          </div>
          <h2 className="text-lg tracking-widest uppercase font-bold">
            {L.heading}
          </h2>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            {this.state.error?.message ?? L.unexpectedError}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-6 py-3 text-white text-xs tracking-[0.2em] uppercase bg-black rounded-none font-bold"
          >
            {L.tryAgain}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
