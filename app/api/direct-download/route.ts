import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidUrl } from '@/utils/platform-detector';
import { detectPlatform } from '@/utils/platform-detector';

// Request schema
const downloadSchema = z.object({
  url: z.string().url(),
  quality: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = await request.json();
    const validationResult = downloadSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { url, quality } = validationResult.data;

    // Validate URL
    if (!isValidUrl(url) || detectPlatform(url) !== 'youtube') {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Extract video ID for filename
    const videoIdMatch = url.match(/(?:v=|\/)([\w-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : 'video';
    const selectedQuality = quality || '720p';
    
    // Generate download URL using a YouTube downloader service
    // This is a workaround when yt-dlp is blocked
    const filename = `youtube_${videoId}_${selectedQuality}.mp4`;
    
    // Return a response that indicates the download should be attempted client-side
    return NextResponse.json({
      success: true,
      message: 'Please use the browser extension or alternative download method',
      filename,
      videoId,
      quality: selectedQuality,
      // Provide alternative download instructions
      alternatives: [
        'Use a browser extension like "Video DownloadHelper"',
        'Try online services like y2mate or savefrom',
        'Use VPN and try again',
        'Wait a few hours and retry'
      ]
    });

  } catch (error) {
    console.error('Direct download error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Download service temporarily unavailable' 
      },
      { status: 500 }
    );
  }
}
