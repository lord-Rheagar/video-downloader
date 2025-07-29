import play from 'play-dl';
import { VideoInfo, VideoFormat } from '@/types';
import { PROXY_CONFIG } from '@/config/proxy';

// Proxy configuration commented out - setToken doesn't support proxy property
// if (PROXY_CONFIG.useProxy && PROXY_CONFIG.proxyUrl) {
//   play.setToken({
//     proxy: [PROXY_CONFIG.proxyUrl]
//   });
// }

export async function extractYouTubeVideo(url: string): Promise<VideoInfo> {
  if (!url) {
    throw new Error('URL is missing or invalid.');
  }
  try {
    // Only get video info, don't create a stream yet
    const info = await play.video_info(url);
    
    // Filter for only 360p, 720p, and 1080p MP4 formats
    const allowedQualities = ['360p', '720p', '1080p'];
    
    // Use only H.264 compatible formats for Windows Media Player
    // These are the ONLY formats we should offer to ensure compatibility
    const windowsCompatibleFormats: VideoFormat[] = [
      { quality: '1080p', format: 'mp4', formatId: '137+140', size: info.format.find(f => f.itag === 137)?.contentLength ? parseInt(info.format.find(f => f.itag === 137)!.contentLength!) : undefined },
      { quality: '720p', format: 'mp4', formatId: '22', size: info.format.find(f => f.itag === 22)?.contentLength ? parseInt(info.format.find(f => f.itag === 22)!.contentLength!) : undefined },
      { quality: '480p', format: 'mp4', formatId: '135+140', size: info.format.find(f => f.itag === 135)?.contentLength ? parseInt(info.format.find(f => f.itag === 135)!.contentLength!) : undefined },
      { quality: '360p', format: 'mp4', formatId: '18', size: info.format.find(f => f.itag === 18)?.contentLength ? parseInt(info.format.find(f => f.itag === 18)!.contentLength!) : undefined }
    ];
    
    // Filter out formats that don't exist for this video
    const formats: VideoFormat[] = windowsCompatibleFormats
      .filter(format => {
        // For pre-muxed formats (22, 18), check if they exist
        if (format.formatId === '22') {
          return info.format.some(f => f.itag === 22);
        } else if (format.formatId === '18') {
          return info.format.some(f => f.itag === 18);
        }
        // For separate formats, check if the video format exists (audio 140 is usually available)
        else if (format.formatId === '137+140') {
          return info.format.some(f => f.itag === 137);
        } else if (format.formatId === '135+140') {
          return info.format.some(f => f.itag === 135);
        }
        return false;
      })
      .sort((a, b) => {
        const qualityOrder = { '1080p': 0, '720p': 1, '480p': 2, '360p': 3 };
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
