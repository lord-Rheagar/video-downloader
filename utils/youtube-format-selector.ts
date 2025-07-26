/**
 * YouTube format selection utility for Windows Media Player compatibility
 */

export interface YouTubeFormat {
  formatId: string;
  quality: string;
  description: string;
  needsConversion: boolean;
}

// Pre-muxed formats (most reliable, no merging needed)
const PREMUXED_FORMATS: Record<string, YouTubeFormat> = {
  '1080p': {
    formatId: '37', // 1080p MP4 (if available, rare)
    quality: '1080p',
    description: '1080p MP4 H.264+AAC',
    needsConversion: false,
  },
  '720p': {
    formatId: '22', // Most reliable format
    quality: '720p',
    description: '720p MP4 H.264+AAC',
    needsConversion: false,
  },
  '360p': {
    formatId: '18', // Very reliable, always available
    quality: '360p', 
    description: '360p MP4 H.264+AAC',
    needsConversion: false,
  },
};

// Separate video/audio formats (need merging)
const SEPARATE_FORMATS: Record<string, YouTubeFormat> = {
  '1080p': {
    formatId: '137+140', // 1080p H.264 + AAC audio
    quality: '1080p',
    description: '1080p H.264 + AAC audio',
    needsConversion: true,
  },
  '720p': {
    formatId: '136+140', // 720p H.264 + AAC audio
    quality: '720p',
    description: '720p H.264 + AAC audio', 
    needsConversion: true,
  },
  '480p': {
    formatId: '135+140', // 480p H.264 + AAC audio
    quality: '480p',
    description: '480p H.264 + AAC audio',
    needsConversion: true,
  },
};

/**
 * Get the best YouTube format for a given quality
 * Prioritizes pre-muxed formats for reliability
 */
export function getYouTubeFormat(quality?: string): { primary: string; fallback: string; needsConversion: boolean } {
  const requestedQuality = quality || '720p';
  
  // Build format string with fallbacks
  let formats: string[] = [];
  let needsConversion = false;
  
  switch (requestedQuality) {
    case '1080p':
      // Try pre-muxed 1080p first (rare), then separate streams, then fall back to 720p
      formats = ['37', '137+140', '22', '136+140'];
      needsConversion = true; // Most likely will need conversion
      break;
      
    case '720p':
      // Format 22 is the gold standard - pre-muxed 720p
      formats = ['22', '136+140', '18'];
      needsConversion = false; // Format 22 usually available
      break;
      
    case '480p':
      // No pre-muxed 480p, so use separate streams
      formats = ['135+140', '22', '18'];
      needsConversion = true;
      break;
      
    case '360p':
      // Format 18 is very reliable
      formats = ['18', '134+140', '22'];
      needsConversion = false;
      break;
      
    default:
      // Default to 720p strategy
      formats = ['22', '136+140', '18'];
      needsConversion = false;
  }
  
  // Join formats with fallback operator
  const primary = formats[0];
  const fallback = formats.join('/');
  
  return { primary, fallback, needsConversion };
}

/**
 * Get a format string that ensures Windows compatibility
 */
export function getWindowsCompatibleFormat(quality?: string, useAdvanced: boolean = false): string {
  if (useAdvanced) {
    // Advanced format selection with codec checks
    const { fallback } = getYouTubeFormat(quality);
    return fallback;
  } else {
    // Simple format selection using known good H.264 formats
    // Always specify both H.264 format IDs to avoid VP9/AV1
    const qualityMap: Record<string, string> = {
      '1080p': '137+140/299+140/22',  // H.264 1080p + AAC, fallback to 720p
      '720p': '22/136+140/298+140',    // Pre-muxed 720p or H.264 + AAC
      '480p': '135+140/18',            // H.264 480p + AAC, fallback to 360p
      '360p': '18/134+140',            // Pre-muxed 360p or H.264 + AAC
    };
    return qualityMap[quality || '720p'] || qualityMap['720p'];
  }
}

/**
 * Check if a format ID needs audio/video merging
 */
export function formatNeedsMerging(formatId: string): boolean {
  return formatId.includes('+');
}

/**
 * Get all available formats for diagnostics
 */
export function getAllFormats(): Record<string, YouTubeFormat> {
  return {
    ...PREMUXED_FORMATS,
    ...SEPARATE_FORMATS,
  };
}
