import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isValidUrl } from '@/utils/platform-detector';
import { detectPlatform } from '@/utils/platform-detector';
import { sanitizeFilename } from '@/utils/filename-sanitizer';

const execAsync = promisify(exec);

// Request schema for video stream
const streamSchema = z.object({
  url: z.string().url(),
  formatId: z.string().optional(),
  quality: z.string().optional(),
});

// Rate limiting map (simple in-memory for now)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

// Cache for video info to avoid repeated calls
const videoInfoCache = new Map<string, { info: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limit
    const now = Date.now();
    const userLimit = rateLimitMap.get(clientIp);
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT_MAX) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Rate limit exceeded. Please try again later.' 
            },
            { status: 429 }
          );
        }
        userLimit.count++;
      } else {
        rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      }
    } else {
      rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = streamSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request. Please provide a valid URL.',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { url, formatId, quality } = validationResult.data;

    // Additional URL validation
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please enter a valid URL' 
        },
        { status: 400 }
      );
    }

    // Check if platform is supported
    const platform = detectPlatform(url);
    if (platform !== 'youtube') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Currently only YouTube downloads are supported' 
        },
        { status: 400 }
      );
    }

    // Check cache for video info
    let videoInfo;
    const cached = videoInfoCache.get(url);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('Using cached video info');
      videoInfo = cached.info;
    } else {
      // Get video info
      const infoCommand = `python -m yt_dlp --no-warnings --no-playlist --dump-json "${url}"`;
      
      try {
        const { stdout: infoOutput } = await execAsync(infoCommand);
        videoInfo = JSON.parse(infoOutput);
        // Cache the info
        videoInfoCache.set(url, { info: videoInfo, timestamp: now });
      } catch (error) {
        console.error('Failed to get video info:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to retrieve video information. The video might be unavailable or private.' 
          },
          { status: 404 }
        );
      }
    }

    // Generate filename
    const baseFilename = sanitizeFilename(videoInfo.title || 'video');
    const qualityLabel = quality || '720p';
    const filename = `${baseFilename}_${qualityLabel}.mp4`;

    // For YouTube, we can use specific format IDs that are known to be H.264
    // These are direct format codes that work universally
    const h264Formats: Record<string, string> = {
      '1080p': '137+140', // 1080p H.264 video + AAC audio
      '720p': '22',       // 720p H.264 with audio (single file)
      '360p': '18',       // 360p H.264 with audio (single file)
    };

    // Check if we can use a direct single-file format (faster)
    const requestedQuality = quality || '720p';
    const isSingleFileFormat = requestedQuality === '720p' || requestedQuality === '360p';
    
    try {
      const { spawn } = require('child_process');
      
      let args;
      
      if (formatId) {
        // Use specific format ID if provided
        args = [
          '-m', 'yt_dlp',
          '--no-warnings',
          '--no-playlist',
          '-f', formatId,
          '-o', '-',
          url
        ];
      } else if (isSingleFileFormat) {
        // Use single file format for 720p and 360p (faster, no merging needed)
        console.log(`Using single-file format ${h264Formats[requestedQuality]} for ${requestedQuality}`);
        args = [
          '-m', 'yt_dlp',
          '--no-warnings',
          '--no-playlist',
          '-f', h264Formats[requestedQuality],
          '-o', '-',
          url
        ];
      } else {
        // For 1080p, we need to merge video and audio
        console.log(`Using merged format for ${requestedQuality}`);
        args = [
          '-m', 'yt_dlp',
          '--no-warnings',
          '--no-playlist',
          '-f', h264Formats[requestedQuality] || h264Formats['720p'],
          '--merge-output-format', 'mp4',
          '--postprocessor-args', '-c:v copy -c:a aac -movflags +faststart',
          '-o', '-',
          url
        ];
      }
      
      console.log('Executing: python', args.join(' '));
      
      const ytdlpProcess = spawn('python', args, {
        windowsHide: true,
        // Increase buffer size for better streaming
        highWaterMark: 64 * 1024
      });

      // Handle process errors
      ytdlpProcess.on('error', (error: Error) => {
        console.error('Failed to start yt-dlp process:', error);
      });

      let errorOutput = '';
      ytdlpProcess.stderr.on('data', (data: Buffer) => {
        const stderr = data.toString();
        errorOutput += stderr;
        if (!stderr.includes('WARNING') && !stderr.includes('[download]') && !stderr.includes('[merger]')) {
          console.error('yt-dlp stderr:', stderr);
        }
      });

      // Check if process started successfully
      let processStarted = false;
      let processEnded = false;
      
      ytdlpProcess.stdout.once('data', () => {
        processStarted = true;
        console.log('yt-dlp started streaming data');
      });

      // Don't kill the process prematurely - yt-dlp needs time to fetch video info
      // Instead, we'll rely on error handling if the process fails

      // Create response headers
      const headers = new Headers({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
        // Add CORS headers if needed
        'Access-Control-Allow-Origin': '*',
      });

      // Create a readable stream from the process stdout
      const stream = new ReadableStream({
        start(controller) {
          ytdlpProcess.stdout.on('data', (chunk: Buffer) => {
            controller.enqueue(chunk);
          });

          ytdlpProcess.stdout.on('end', () => {
            console.log('Stream ended successfully');
            controller.close();
          });

          ytdlpProcess.on('close', (code: number) => {
            if (code !== 0) {
              console.error(`yt-dlp process exited with code ${code}`);
              console.error('Error output:', errorOutput);
              controller.error(new Error(`Download failed with code ${code}`));
            }
          });

          ytdlpProcess.on('error', (error: Error) => {
            console.error('yt-dlp process error:', error);
            controller.error(error);
          });
        },
        cancel() {
          console.log('Stream cancelled by client');
          ytdlpProcess.kill();
        }
      });

      return new NextResponse(stream, {
        status: 200,
        headers,
      });

    } catch (error) {
      console.error('Download stream error:', error);
      
      let errorMessage = 'Failed to download video';
      if (error instanceof Error) {
        if (error.message.includes('formats are not available')) {
          errorMessage = 'The requested video format is not available. Try a different quality.';
        } else if (error.message.includes('Video unavailable')) {
          errorMessage = 'This video is unavailable or private';
        } else if (error.message.includes('429')) {
          errorMessage = 'YouTube rate limit reached. Please try again later';
        }
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Stream API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}

// Clean up old rate limit entries and cache periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean rate limits
  for (const [ip, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
  
  // Clean cache
  for (const [url, cached] of videoInfoCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION) {
      videoInfoCache.delete(url);
    }
  }
}, RATE_LIMIT_WINDOW);
