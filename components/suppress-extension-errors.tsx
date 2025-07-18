"use client";

import { useEffect } from "react";

export function SuppressExtensionErrors() {
  useEffect(() => {
    // Override console methods to filter extension errors
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.error = (...args: any[]) => {
      const errorStr = args.join(' ');
      if (
        errorStr.includes('solanaActions') ||
        errorStr.includes('MutationObserver') ||
        errorStr.includes('chrome-extension://') ||
        errorStr.includes('Failed to execute \'observe\'') ||
        errorStr.includes('parameter 1 is not of type \'Node\'')
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const warnStr = args.join(' ');
      if (
        warnStr.includes('solanaActions') ||
        warnStr.includes('MutationObserver') ||
        warnStr.includes('chrome-extension://')
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };

    // Suppress uncaught errors from browser extensions
    const handleError = (event: ErrorEvent) => {
      if (
        event.filename?.includes('chrome-extension://') ||
        event.filename?.includes('moz-extension://') ||
        event.message?.includes('solanaActions') ||
        event.message?.includes('MutationObserver') ||
        event.message?.includes('chrome-extension') ||
        event.message?.includes('extension://') ||
        event.message?.includes('Failed to execute \'observe\'') ||
        event.message?.includes('parameter 1 is not of type \'Node\'')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    };

    // Suppress unhandled promise rejections from extensions
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (
        error?.stack?.includes('chrome-extension://') ||
        error?.stack?.includes('moz-extension://') ||
        error?.message?.includes('solanaActions') ||
        error?.message?.includes('MutationObserver') ||
        error?.message?.includes('chrome-extension') ||
        error?.message?.includes('extension://') ||
        error?.message?.includes('Failed to execute \'observe\'') ||
        error?.message?.includes('parameter 1 is not of type \'Node\'')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      // Restore original console methods
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}
