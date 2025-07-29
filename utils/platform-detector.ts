import { Platform } from '@/types';

export function detectPlatform(url: string): Platform {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    }
    
    
    if (hostname.includes('reddit.com') || hostname.includes('v.redd.it')) {
      return 'reddit';
    }
    
    return 'unknown';
  } catch (error) {
    // If URL parsing fails, return unknown
    return 'unknown';
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
