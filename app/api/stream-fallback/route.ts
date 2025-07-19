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

// Request schema
const streamSchema = z.object({
  url: z.string().url(),
  formatId: z.string().optional(),
  quality: z.string().optional(),
});

// Simple rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const clientData = requestCounts.get(clientIp);
    
    if (clientData) {
      if (now < clientData.resetTime) {
        if (clientData.count >= RATE_LIMIT) {
          return NextResponse.json(
            { success: false, error: 'Too many requests. Please wait a moment.' },
            { status: 429 }
          );
        }
        clientData.count++;
      } else {
        requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_WINDOW });
      }
    } else {
      requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_WINDOW });
    }

    // Parse request
    const body = await request.json();
    const validationResult = streamSchema.safeParse(body);
    
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

    // Extract video ID from URL
    const videoIdMatch = url.match(/(?:v=|\/)([\w-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Could not extract video ID' },
        { status: 400 }
      );
    }

    // Generate a simple filename
    const filename = `youtube_${videoId}_${quality || '720p'}.mp4`;

    // Use simpler format selection
    const formatMap: Record<string, string> = {
      '1080p': 'best[height<=1080]',
      '720p': 'best[height<=720]',
      '360p': 'best[height<=360]',
    };

    const selectedQuality = quality || '720p';
    const formatString = formatMap[selectedQuality] || formatMap['720p'];

    // Create temp file
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `dl_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);

    // Use yt-dlp with minimal options to avoid detection
    const downloadCmd = [
      'python', '-m', 'yt_dlp',
      '--quiet',
      '--no-warnings',
      '-f', formatString,
      '--no-check-certificate',
      '--geo-bypass',
      '-o', tempFilePath,
      url
    ].join(' ');

    console.log('Attempting download with fallback method...');

    try {
      // Try to download
      await execAsync(downloadCmd, {
        maxBuffer: 1024 * 1024 * 10,
        timeout: 5 * 60 * 1000 // 5 minute timeout
      });

      // Check if file exists
      if (!fs.existsSync(tempFilePath)) {
        throw new Error('Download failed - file not created');
      }

      const stats = await fs.promises.stat(tempFilePath);
      const fileStream = fs.createReadStream(tempFilePath);

      // Set response headers
      const headers = new Headers({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'no-cache',
      });

      // Create response stream
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => {
            controller.enqueue(chunk);
          });

          fileStream.on('end', () => {
            controller.close();
            // Delete temp file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
              fs.unlink(tempFilePath, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
              });
            }
          });

          fileStream.on('error', (error) => {
            console.error('Stream error:', error);
            controller.error(error);
            // Delete temp file on error
            if (tempFilePath && fs.existsSync(tempFilePath)) {
              fs.unlink(tempFilePath, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
              });
            }
          });
        },
        cancel() {
          fileStream.destroy();
          // Delete temp file on cancel
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlink(tempFilePath, (err) => {
              if (err) console.error('Failed to delete temp file:', err);
            });
          }
        }
      });

      return new NextResponse(stream, {
        status: 200,
        headers,
      });

    } catch (downloadError) {
      // Clean up temp file if exists
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      console.error('Download error:', downloadError);
      
      // Return a proper error response instead of throwing
      return NextResponse.json(
        { 
          success: false, 
          error: 'YouTube is blocking automated downloads. Please try alternative methods.',
          alternatives: true
        },
        { status: 403 }
      );
    }

  } catch (error) {
    // Clean up temp file on any error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.error('Failed to clean up temp file:', e);
      }
    }
    
    console.error('Fallback API error:', error);
    
    let errorMessage = 'Failed to download video';
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('Too many')) {
        errorMessage = 'YouTube rate limit. Please wait a few minutes.';
      } else if (error.message.includes('blocking')) {
        errorMessage = 'YouTube is blocking downloads. Try again later.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Download timeout. Try a shorter video.';
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Cleanup old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 60 * 1000);
