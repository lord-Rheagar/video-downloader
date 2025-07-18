import { VideoInfo, Platform } from '@/types';
import { detectPlatform, isValidUrl } from '@/utils/platform-detector';
import { extractYouTubeVideo } from './extractors/youtube';
import { PLATFORM_CONFIG } from '@/config/platforms';

export async function extractVideoInfo(url: string): Promise<VideoInfo> {
  // First check if it's a valid URL
  if (!isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  const platform = detectPlatform(url);
  const platformConfig = PLATFORM_CONFIG[platform];

  // Check if platform is supported
  if (!platformConfig.supported) {
    if (platformConfig.comingSoon) {
      throw new Error(`${platformConfig.displayName} support is coming soon! Currently, only YouTube is supported.`);
    } else if (platform === 'unknown') {
      throw new Error('This URL is not from a supported video platform. Please use a YouTube, Twitter, Instagram, Facebook, or Reddit video URL.');
    }
  }

  try {
    switch (platform) {
      case 'youtube':
        return await extractYouTubeVideo(url);
      
      case 'twitter':
      case 'instagram':
      case 'facebook':
      case 'reddit':
        // This should not be reached due to the check above
        throw new Error(`${platformConfig.displayName} support is coming soon!`);
      
      default:
        throw new Error('Unable to process this video URL');
    }
  } catch (error) {
    // Re-throw with more user-friendly message if needed
    if (error instanceof Error) {
      if (error.message.includes('Video unavailable')) {
        throw new Error('This video is unavailable or private. Please check the URL and try again.');
      }
      if (error.message.includes('Failed to extract')) {
        throw new Error('Unable to extract video information. The video might be restricted or the URL might be incorrect.');
      }
      throw error;
    }
    throw new Error('An unexpected error occurred while processing the video');
  }
}
