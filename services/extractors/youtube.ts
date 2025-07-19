import play from 'play-dl';
import { VideoInfo, VideoFormat } from '@/types';
import { PROXY_CONFIG } from '@/config/proxy';

if (PROXY_CONFIG.useProxy && PROXY_CONFIG.proxyUrl) {
  play.setToken({
    proxy: [PROXY_CONFIG.proxyUrl]
  });
}

export async function extractYouTubeVideo(url: string): Promise<VideoInfo> {
  if (!url) {
    throw new Error('URL is missing or invalid.');
  }
  try {
    // Only get video info, don't create a stream yet
    const info = await play.video_info(url);
    
    // Filter for only 360p, 720p, and 1080p MP4 formats
    const allowedQualities = ['360p', '720p', '1080p'];
    
    // First, add hardcoded options to ensure they're always available
    // Note: format 22 (720p) and 18 (360p) include both video and audio
    // For 1080p, we need to combine video (137) with audio (140)
    const hardcodedFormats: VideoFormat[] = [
      { quality: '1080p', format: 'mp4', formatId: '137+140' },
      { quality: '720p', format: 'mp4', formatId: '22' },
      { quality: '360p', format: 'mp4', formatId: '18' }
    ];
    
    // Then filter actual formats from the video
    const allFormats = info.format
      .filter(format => {
        // Check if it has a quality label
        if (!format.qualityLabel || !format.mimeType) return false;
        
        // Check if it's an allowed quality
        if (!allowedQualities.includes(format.qualityLabel)) return false;
        
        // Include any video format with our target qualities
        return true;
      })
      .map(format => ({
        quality: format.qualityLabel || 'unknown',
        format: 'mp4',
        size: format.contentLength ? parseInt(format.contentLength) : undefined,
        url: format.url || '',
        formatId: format.itag?.toString() || undefined
      }));
    
    // Remove duplicates by keeping only one format per quality level
    const uniqueFormats = new Map<string, VideoFormat>();
    
    // First add hardcoded formats as defaults
    hardcodedFormats.forEach(format => {
      uniqueFormats.set(format.quality, format);
    });
    
    // Then override with actual formats if available
    allFormats.forEach(format => {
      const existing = uniqueFormats.get(format.quality);
      // Keep the format with actual data from the video
      if (!existing || format.formatId) {
        uniqueFormats.set(format.quality, format);
      }
    });
    
    // Convert back to array and sort
    const formats: VideoFormat[] = Array.from(uniqueFormats.values())
      .sort((a, b) => {
        const qualityOrder = { '1080p': 0, '720p': 1, '360p': 2 };
        return (qualityOrder[a.quality as keyof typeof qualityOrder] || 999) - 
               (qualityOrder[b.quality as keyof typeof qualityOrder] || 999);
      });

    return {
      title: info.video_details.title || '',
      duration: info.video_details.durationInSec,
      thumbnail: info.video_details.thumbnails[info.video_details.thumbnails.length - 1]?.url,
      author: info.video_details.channel?.name || '',
      platform: 'youtube',
      formats,
      url
    };
  } catch (error) {
    console.error('Error extracting YouTube video:', error);
    throw new Error('Failed to extract YouTube video information');
  }
}

export function downloadYouTubeVideo(url: string, quality?: string) {
  return play.stream(url, { 
    quality: quality ? (parseInt(quality) as 1 | 2 | 0) : undefined 
  });
}
