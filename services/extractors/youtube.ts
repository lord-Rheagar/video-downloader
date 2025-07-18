import ytdl from 'ytdl-core';
import { VideoInfo, VideoFormat } from '@/types';

export async function extractYouTubeVideo(url: string): Promise<VideoInfo> {
  try {
    const info = await ytdl.getInfo(url);
    
    const formats: VideoFormat[] = info.formats
      .filter(format => format.hasVideo && format.hasAudio)
      .map(format => ({
        quality: format.qualityLabel || format.quality || 'unknown',
        format: format.container || 'mp4',
        size: format.contentLength ? parseInt(format.contentLength) : undefined,
        url: format.url
      }));

    return {
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
      author: info.videoDetails.author.name,
      platform: 'youtube',
      formats
    };
  } catch (error) {
    console.error('Error extracting YouTube video:', error);
    throw new Error('Failed to extract YouTube video information');
  }
}

export function downloadYouTubeVideo(url: string, quality?: string) {
  const options: ytdl.downloadOptions = quality ? { quality } : { quality: 'highest' };
  return ytdl(url, options);
}
