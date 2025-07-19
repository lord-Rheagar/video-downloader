import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isValidUrl } from '@/utils/platform-detector';
import { detectPlatform } from '@/utils/platform-detector';
import { sanitizeFilename } from '@/utils/filename-sanitizer';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
  let tempFilePath: string | null = null;
  
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
        // Reset the rate limit window
        rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      }
    } else {
      // First request from this IP
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

    // First, get video info to extract title for filename
    const infoCommand = `python -m yt_dlp --no-warnings --no-playlist --dump-json "${url}"`;
    
    let videoInfo;
    try {
      const { stdout: infoOutput } = await execAsync(infoCommand);
      videoInfo = JSON.parse(infoOutput);
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

    // Generate filename
    const baseFilename = sanitizeFilename(videoInfo.title || 'video');
    const qualityLabel = quality || '720p';
    const filename = `${baseFilename}_${qualityLabel}.mp4`;

    // Create temp file path
    const tempDir = os.tmpdir();
    const tempFileName = `video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
    tempFilePath = path.join(tempDir, tempFileName);

    // Build yt-dlp command for downloading
    let formatString;
    if (formatId) {
      formatString = formatId;
    } else {
      // Use format selection that prioritizes H.264 codec for compatibility
      // But use simpler format strings that work reliably
      const qualityFormats: Record<string, string> = {
        '1080p': '137+140/299+140/best[height<=1080]',
        '720p': '136+140/298+140/best[height<=720]',
        '360p': '134+140/best[height<=360]',
      };
      formatString = qualityFormats[quality || '720p'] || qualityFormats['720p'];
    }

    const downloadCommand = `python -m yt_dlp --no-warnings --no-playlist -f "${formatString}" --merge-output-format mp4 -o "${tempFilePath}" "${url}"`;
    
    console.log('Executing download command:', downloadCommand);

    try {
      // Download the video to temp file
      await execAsync(downloadCommand, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer for command output
      
      // Check if file exists and get its size
      const stats = await fs.promises.stat(tempFilePath);
      
      // Create a read stream from the temp file
      const fileStream = fs.createReadStream(tempFilePath);
      
      // Create response headers
      const headers = new Headers({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'no-cache',
      });

      // Create a readable stream for the response
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => {
            controller.enqueue(chunk);
          });

          fileStream.on('end', () => {
            controller.close();
            // Clean up temp file after streaming
            fs.unlink(tempFilePath!, (err) => {
              if (err) console.error('Failed to delete temp file:', err);
            });
          });

          fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            controller.error(error);
            // Clean up temp file on error
            fs.unlink(tempFilePath!, (err) => {
              if (err) console.error('Failed to delete temp file:', err);
            });
          });
        },
        cancel() {
          fileStream.destroy();
          // Clean up temp file on cancel
          fs.unlink(tempFilePath!, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
          });
        }
      });

      return new NextResponse(stream, {
        status: 200,
        headers,
      });

    } catch (error) {
      // Clean up temp file on error
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      console.error('Download error:', error);
      
      let errorMessage = 'Failed to download video';
      if (error instanceof Error) {
        if (error.message.includes('Requested format is not available')) {
          errorMessage = 'The requested video quality is not available. Try a different quality.';
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
    // Clean up temp file on any error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
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
