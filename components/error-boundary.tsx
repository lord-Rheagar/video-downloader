"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console but filter out extension errors
    if (!error.message?.includes('solanaActions') && 
        !error.message?.includes('MutationObserver') &&
        !error.stack?.includes('chrome-extension://')) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Only show error UI for non-extension errors
      const isExtensionError = this.state.error?.message?.includes('solanaActions') ||
                               this.state.error?.message?.includes('MutationObserver') ||
                               this.state.error?.stack?.includes('chrome-extension://');
      
      if (isExtensionError) {
        // For extension errors, just render children normally
        return this.props.children;
      }

      // For actual app errors, show error UI
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4">An error occurred while rendering this page.</p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
