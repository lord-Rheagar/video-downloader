import { VideoInfo, VideoFormat } from '@/types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface YtDlpVideoInfo {
  title?: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  formats?: Array<{
    format_id: string;
    ext: string;
    height?: number;
    filesize?: number;
    url?: string;
    format_note?: string;
  }>;
  id?: string;
  webpage_url?: string;
}

export async function extractTwitterVideo(url: string): Promise<VideoInfo> {
  try {
    // Validate URL format
    const tweetIdMatch = url.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(?:[\w_]+)\/status(?:es)?\/(\d+)/);
    
    if (!tweetIdMatch || !tweetIdMatch[1]) {
      throw new Error('Invalid Twitter/X URL format');
    }

    // Use yt-dlp to extract video information
    // Add user agent and other options to improve Twitter compatibility
    const command = `python -m yt_dlp -j --no-warnings --no-check-certificate --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${url}"`;
    
    console.log('Executing yt-dlp command for Twitter:', command);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      if (stderr && !stderr.includes('WARNING')) {
        console.error('yt-dlp stderr:', stderr);
      }
      
      const videoInfo: YtDlpVideoInfo = JSON.parse(stdout);
      
      // Filter and map formats
      const formats: VideoFormat[] = [];
      
      if (videoInfo.formats) {
        // Get MP4 formats with different qualities
        const mp4Formats = videoInfo.formats
          .filter(f => f.ext === 'mp4' && f.height && f.url)
          .sort((a, b) => (b.height || 0) - (a.height || 0));
        
        // Map common heights to quality labels
        const heightToQuality: { [key: number]: string } = {
          1080: '1080p',
          720: '720p',
          480: '480p',
          360: '360p',
          240: '240p'
        };
        
        // Add unique qualities
        const addedQualities = new Set<string>();
        
        for (const format of mp4Formats) {
          const quality = heightToQuality[format.height || 0] || `${format.height}p`;
          
          if (!addedQualities.has(quality)) {
            formats.push({
              quality,
              format: 'mp4',
              size: format.filesize,
              url: format.url,
              formatId: format.format_id
            });
            addedQualities.add(quality);
          }
        }
      }
      
      // If no formats found, add a default one
      if (formats.length === 0) {
        formats.push({
          quality: 'best',
          format: 'mp4',
          formatId: 'best'
        });
      }
      
      return {
        title: videoInfo.title || `Twitter Video`,
        platform: 'twitter',
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        author: videoInfo.uploader || 'Twitter User',
        formats,
        url: videoInfo.webpage_url || url
      };
      
    } catch (execError) {
      console.error('Error executing yt-dlp:', execError);
      
      if (execError instanceof Error) {
        console.error('execError message:', execError.message);
        
        if (execError.message.includes('Unsupported URL')) {
          throw new Error('This tweet does not contain a video');
        }
        if (execError.message.includes('returned non-zero exit status 1')) {
          throw new Error('Unable to access this video. It might be private or deleted.');
        }
        if (execError.message.includes('Unable to extract guest token')) {
          throw new Error('Twitter authentication failed. Please try again later.');
        }
        if (execError.message.includes('No video formats found')) {
          throw new Error('No downloadable video found in this tweet.');
        }
        if (execError.message.includes('HTTP Error 404')) {
          throw new Error('Tweet not found or has been deleted.');
        }
        // Pass through the original error message if it's informative
        if (execError.message.includes('ERROR:')) {
          const errorMatch = execError.message.match(/ERROR: (.+)/);
          if (errorMatch) {
            throw new Error(errorMatch[1]);
          }
        }
      }
      
      throw new Error('Failed to extract video information from Twitter');
    }
    
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract Twitter video information');
  }
}
