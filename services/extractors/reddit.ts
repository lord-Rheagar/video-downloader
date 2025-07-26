import { VideoInfo, VideoFormat } from '@/types';
import { detectPlatform } from '@/utils/platform-detector';
import { promisify } from 'util';
import { exec } from 'child_process';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

interface RedditVideoData {
  dash_url: string;
  duration: number;
  fallback_url: string;
  height: number;
  width: number;
  scrubber_media_url: string;
  hls_url: string;
  is_gif: boolean;
  has_audio: boolean;
}

interface RedditPost {
  title: string;
  author: string;
  subreddit: string;
  thumbnail: string;
  is_video: boolean;
  url: string;
  permalink: string;
  secure_media?: {
    reddit_video?: RedditVideoData;
  };
  media?: {
    reddit_video?: RedditVideoData;
  };
  crosspost_parent_list?: RedditPost[];
  preview?: {
    images?: Array<{
      source: {
        url: string;
        width: number;
        height: number;
      };
    }>;
  };
}

async function getRedditAudioUrl(videoUrl: string): Promise<string | null> {
  // Extract base URL from video URL
  const baseUrl = videoUrl.substring(0, videoUrl.lastIndexOf('/'));
  
  // Common audio URL patterns for Reddit videos
  const audioPatterns = [
    `${baseUrl}/DASH_AUDIO_128.mp4`,
    `${baseUrl}/DASH_audio.mp4`,
    `${baseUrl}/DASH_AUDIO_64.mp4`,
    `${baseUrl}/audio`,
  ];
  
  // Try each audio URL pattern
  for (const audioUrl of audioPatterns) {
    try {
      const response = await fetch(audioUrl, { method: 'HEAD' });
      if (response.ok) {
        return audioUrl;
      }
    } catch (e) {
      // Continue to next pattern
    }
  }
  
  return null;
}

async function extractVideoQualities(redditVideo: RedditVideoData): Promise<VideoFormat[]> {
  const formats: VideoFormat[] = [];
  const baseUrl = redditVideo.fallback_url.substring(0, redditVideo.fallback_url.lastIndexOf('/'));
  
  // Common quality patterns for Reddit DASH videos
  const qualityPatterns = [
    { quality: '1080p', pattern: 'DASH_1080.mp4', height: 1080 },
    { quality: '720p', pattern: 'DASH_720.mp4', height: 720 },
    { quality: '480p', pattern: 'DASH_480.mp4', height: 480 },
    { quality: '360p', pattern: 'DASH_360.mp4', height: 360 },
    { quality: '240p', pattern: 'DASH_240.mp4', height: 240 },
    { quality: '96p', pattern: 'DASH_96.mp4', height: 96 },
  ];
  
  // Check which qualities are available
  for (const { quality, pattern, height } of qualityPatterns) {
    // Skip if higher than source video height
    if (height > redditVideo.height) continue;
    
    const videoUrl = `${baseUrl}/${pattern}`;
    try {
      const response = await fetch(videoUrl, { method: 'HEAD' });
      if (response.ok) {
        formats.push({
          quality,
          format: 'mp4',
          url: videoUrl,
          formatId: pattern
        });
      }
    } catch (e) {
      // Quality not available
    }
  }
  
  // Always add the fallback URL as an option
  if (formats.length === 0 || redditVideo.fallback_url) {
    formats.push({
      quality: 'best',
      format: 'mp4',
      url: redditVideo.fallback_url,
      formatId: 'fallback'
    });
  }
  
  return formats;
}

export async function extractRedditVideo(url: string): Promise<VideoInfo> {
  try {
    // Validate Reddit URL format
    if (detectPlatform(url) !== 'reddit') {
      throw new Error('Invalid Reddit URL - platform not detected.');
    }

    // This extractor works with post URLs, not direct video links.
    // If a v.redd.it link is passed, we can't get post metadata.
    if (url.includes('v.redd.it')) {
      throw new Error('This function requires a Reddit post URL, not a direct video link.');
    }

    // Clean URL - remove trailing slash if present
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const redditJsonUrl = `${cleanUrl}.json`;
    
    const response = await fetch(redditJsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Reddit post not found or has been deleted');
      }
      throw new Error('Failed to fetch Reddit metadata');
    }

    const data = await response.json() as any[];
    const postData: RedditPost = data[0]?.data?.children[0]?.data;

    if (!postData) {
      throw new Error('Invalid Reddit post data');
    }

    // Check for video in different locations
    let redditVideo: RedditVideoData | undefined;
    
    if (postData.is_video && postData.secure_media?.reddit_video) {
      redditVideo = postData.secure_media.reddit_video;
    } else if (postData.is_video && postData.media?.reddit_video) {
      redditVideo = postData.media.reddit_video;
    } else if (postData.crosspost_parent_list && postData.crosspost_parent_list.length > 0) {
      // Check crosspost for video
      const crosspost = postData.crosspost_parent_list[0];
      if (crosspost.is_video && (crosspost.secure_media?.reddit_video || crosspost.media?.reddit_video)) {
        redditVideo = crosspost.secure_media?.reddit_video || crosspost.media?.reddit_video;
      }
    }
    
    if (!redditVideo) {
      throw new Error('No Reddit-hosted video found in this post');
    }

    // Extract available video qualities
    const formats = await extractVideoQualities(redditVideo);
    
    // Check if audio exists (for videos that need audio merged)
    let audioUrl: string | null = null;
    if (redditVideo.has_audio) {
      audioUrl = await getRedditAudioUrl(redditVideo.fallback_url);
      if (audioUrl) {
        formats.forEach(format => {
          format.audioUrl = audioUrl;
        });
      }
    }

    // Get best thumbnail
    let thumbnail = postData.thumbnail;
    if (postData.preview?.images && postData.preview.images.length > 0) {
      thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
    }
    
    return {
      title: postData.title,
      platform: 'reddit',
      duration: redditVideo.duration,
      thumbnail,
      author: postData.author,
      formats,
      url: `https://www.reddit.com${postData.permalink}`
    };

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract Reddit video information');
  }
}
