// Suppress extension errors as early as possible
(function() {
  // Override console.error to filter out extension errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorString = args.join(' ');
    if (
      errorString.includes('solanaActions') ||
      errorString.includes('MutationObserver') ||
      errorString.includes('chrome-extension://') ||
      errorString.includes('moz-extension://') ||
      errorString.includes('Failed to execute \'observe\'')
    ) {
      return; // Suppress the error
    }
    return originalConsoleError.apply(console, args);
  };

  // Suppress error events
  window.addEventListener('error', function(event) {
    if (
      event.filename?.includes('chrome-extension://') ||
      event.filename?.includes('moz-extension://') ||
      event.message?.includes('solanaActions') ||
      event.message?.includes('MutationObserver') ||
      event.message?.includes('Failed to execute \'observe\'')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  }, true);

  // Suppress unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const error = event.reason;
    if (
      error?.stack?.includes('chrome-extension://') ||
      error?.stack?.includes('moz-extension://') ||
      error?.message?.includes('solanaActions') ||
      error?.message?.includes('MutationObserver') ||
      error?.message?.includes('Failed to execute \'observe\'')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  }, true);
})();
