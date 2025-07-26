/**
 * Sanitize a filename to be safe across different operating systems
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are invalid in filenames
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
  
  // Replace invalid characters with underscore
  let sanitized = filename.replace(invalidChars, '_');
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
  
  // Replace multiple consecutive spaces or underscores with single underscore
  sanitized = sanitized.replace(/[\s_]+/g, '_');
  
  // Limit length to 200 characters (leaving room for quality suffix and extension)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }
  
  // If filename is empty after sanitization, use a default
  if (!sanitized) {
    sanitized = 'download';
  }
  
  // Remove any remaining trailing underscore
  sanitized = sanitized.replace(/_+$/, '');
  
  return sanitized;
}

/**
 * Sanitize a filename for use in HTTP headers (ASCII-only)
 */
export function sanitizeFilenameForHeaders(filename: string): string {
  // First apply regular sanitization
  let sanitized = sanitizeFilename(filename);
  
  // Remove any non-ASCII characters (including emojis) for HTTP header compatibility
  // Replace non-ASCII characters with underscore
  sanitized = sanitized.replace(/[^\x00-\x7F]/g, '_');
  
  // Clean up any multiple underscores that may have been created
  sanitized = sanitized.replace(/_+/g, '_');
  
  // Remove any remaining trailing underscore
  sanitized = sanitized.replace(/_+$/, '');
  
  // If filename is empty after sanitization, use a default
  if (!sanitized) {
    sanitized = 'download';
  }
  
  return sanitized;
}

/**
 * Get a safe filename with timestamp if needed
 */
export function getSafeFilename(
  title: string, 
  quality: string, 
  extension: string = 'mp4',
  includeTimestamp: boolean = false
): string {
  const baseFilename = sanitizeFilename(title);
  const timestamp = includeTimestamp ? `_${Date.now()}` : '';
  
  return `${baseFilename}_${quality}${timestamp}.${extension}`;
}
