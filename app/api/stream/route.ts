import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isValidUrl } from '@/utils/platform-detector';
import { detectPlatform } from '@/utils/platform-detector';
import { sanitizeFilename } from '@/utils/filename-sanitizer';
import { extractVideoInfo } from '@/services/video-extractor';

const execAsync = promisify(exec);

// Request schema for video stream
const streamSchema = z.object({
  url: z.string().url(),
  formatId: z.string().optional(),
  quality: z.string().optional(),
});

// Rate limiting map (simple in-memory for now)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // 10 downloads per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

export async function POST(request: NextRequest) {
  try {
    console.log('Stream API called');
    
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
        // Reset the rate limit window
        rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      }
    } else {
      // First request from this IP
      rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const validationResult = streamSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.issues);
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

    // Define quality map early - using H.264 codec for maximum compatibility
    const qualityMap: Record<string, string> = {
      '1080p': 'bestvideo[height<=1080][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
      '720p': 'bestvideo[height<=720][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
      '360p': 'bestvideo[height<=360][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best',
    };

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
    console.log('Detected platform:', platform);
    
    if (platform === 'unknown') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unsupported platform. Please use a YouTube, Twitter, or Reddit video URL.' 
        },
        { status: 400 }
      );
    }
    
    if (platform !== 'youtube' && platform !== 'twitter' && platform !== 'reddit') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Currently only YouTube, Twitter, and Reddit downloads are supported' 
        },
        { status: 400 }
      );
    }

    // First, get video info to extract title for filename
    let videoInfo;
    let videoTitle = 'video';
    
    // For Reddit, we can now use yt-dlp to handle merging automatically
    if (platform === 'reddit') {
      // For reddit, we'll use a simpler format selection
      const redditQualityMap: Record<string, string> = {
        '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '360p': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      };
      const formatString = quality ? redditQualityMap[quality] || redditQualityMap['720p'] : 'best[ext=mp4]/best';
      
      // Use yt-dlp to handle the download and merge
      const args = [
        '-m', 'yt_dlp',
        '--no-warnings',
        '-f', formatString,
        '--merge-output-format', 'mp4',
        '--recode-video', 'mp4',
        '-o', '-',
        url
      ];
      
      const { spawn } = require('child_process');
      const ytdlpProcess = spawn('python', args, {
        windowsHide: true
      });
      
      let videoTitle = 'video';
      try {
        const extractedInfo = await extractVideoInfo(url);
        videoTitle = extractedInfo.title;
      } catch (e) {
        console.error('Could not extract video title for Reddit, using default');
      }

      const baseFilename = sanitizeFilename(videoTitle);
      const qualityLabel = quality || 'best';
      const filename = `${baseFilename}_${qualityLabel}.mp4`;
      
      const headers = new Headers({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
      });
      
      const stream = new ReadableStream({
        start(controller) {
          ytdlpProcess.stdout.on('data', (chunk: Buffer) => {
            controller.enqueue(chunk);
          });
          
          ytdlpProcess.stdout.on('end', () => {
            controller.close();
          });
          
          ytdlpProcess.on('error', (error: Error) => {
            controller.error(error);
          });
        }
      });
      
      return new NextResponse(stream, {
        status: 200,
        headers,
      });
    } else {
    }
    
    // For non-Reddit platforms (YouTube and Twitter), continue with yt-dlp
    if (platform === 'youtube' || platform === 'twitter') {
      const infoCommand = `python -m yt_dlp --no-warnings --no-playlist --dump-json "${url}"`;
      try {
        const { stdout: infoOutput } = await execAsync(infoCommand);
        videoInfo = JSON.parse(infoOutput);
        videoTitle = videoInfo.title || 'video';
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
    const baseFilename = sanitizeFilename(videoTitle);
    const qualityLabel = quality || formatId || '720p';
    const filename = `${baseFilename}_${qualityLabel}.mp4`;

    // Build yt-dlp command for getting direct URL
    let ytDlpCommand = `python -m yt_dlp --no-warnings --no-playlist -f `;
    
    if (formatId) {
      // Use specific format ID if provided
      ytDlpCommand += `${formatId}`;
    } else if (quality) {
      // Use quality-based format selection
      ytDlpCommand += qualityMap[quality] || qualityMap['720p'];
    } else {
      // Default to best available MP4
      ytDlpCommand += 'best[ext=mp4]/best';
    }
    
    ytDlpCommand += ` -g "${url}"`;

    try {
      // Always use yt-dlp to download directly - this ensures proper format and compatibility
      console.log('Starting video download with yt-dlp...');
      
      const { spawn } = require('child_process');
      
      // Build the format string - prioritize H.264 for compatibility
      let formatString;
      if (formatId) {
        formatString = formatId;
      } else if (quality) {
        // Use simple format selection that ensures H.264 codec
        // For Twitter and Reddit, use simpler format selection
        if (platform === 'twitter' || platform === 'reddit') {
          const simpleQualityMap: Record<string, string> = {
            '1080p': 'best[height<=1080][ext=mp4]/best[ext=mp4]/best',
            '720p': 'best[height<=720][ext=mp4]/best[ext=mp4]/best',
            '480p': 'best[height<=480][ext=mp4]/best[ext=mp4]/best',
            '360p': 'best[height<=360][ext=mp4]/best[ext=mp4]/best',
          };
          formatString = simpleQualityMap[quality] || simpleQualityMap['720p'];
        } else {
          formatString = qualityMap[quality] || qualityMap['720p'];
        }
      } else {
        // Default to best H.264 format
        if (platform === 'twitter' || platform === 'reddit') {
          formatString = 'best[ext=mp4]/best';
        } else {
          formatString = 'bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        }
      }
      
      // Use yt-dlp to download and merge with proper codec
      const args = [
        '-m', 'yt_dlp',
        '--no-warnings',
        '--no-playlist',
        '-f', formatString,
        '--merge-output-format', 'mp4',
        '--recode-video', 'mp4',
        '-o', '-',
        url
      ];
      
      console.log('Executing: python', args.join(' '));
      
      const ytdlpProcess = spawn('python', args, {
        windowsHide: true
      });

      // Create response headers
      const headers = new Headers({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
      });

      // Create a readable stream from the process stdout
      const stream = new ReadableStream({
        start(controller) {
          ytdlpProcess.stdout.on('data', (chunk: Buffer) => {
            controller.enqueue(chunk);
          });

          ytdlpProcess.stdout.on('end', () => {
            controller.close();
          });

          ytdlpProcess.on('error', (error: Error) => {
            console.error('yt-dlp process error:', error);
            controller.error(error);
          });

          ytdlpProcess.stderr.on('data', (data: Buffer) => {
            const stderr = data.toString();
            if (!stderr.includes('WARNING') && !stderr.includes('Merging formats')) {
              console.error('yt-dlp stderr:', stderr);
            }
          });
        },
        cancel() {
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
          errorMessage = 'The requested video format is not available';
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

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);
