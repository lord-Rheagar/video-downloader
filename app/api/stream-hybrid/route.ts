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

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

// Cache for video info
const videoInfoCache = new Map<string, { info: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

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
      // Get video info with better extraction options to avoid 403
      const infoCommand = `python -m yt_dlp --no-warnings --no-playlist --dump-json --no-check-certificate --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${url}"`;
      
      try {
        const { stdout: infoOutput } = await execAsync(infoCommand, {
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large video info
        });
        videoInfo = JSON.parse(infoOutput);
        // Cache the info
        videoInfoCache.set(url, { info: videoInfo, timestamp: now });
      } catch (error) {
        console.error('Failed to get video info:', error);
        
        let errorMessage = 'Failed to retrieve video information.';
        if (error instanceof Error) {
          if (error.message.includes('HTTP Error 403') || error.message.includes('403')) {
            errorMessage = 'YouTube is blocking the request. Please try again in a few moments.';
          } else if (error.message.includes('Video unavailable')) {
            errorMessage = 'This video is unavailable or private.';
          } else if (error.message.includes('age')) {
            errorMessage = 'This video is age-restricted and cannot be downloaded.';
          }
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage 
          },
          { status: 404 }
        );
      }
    }

    // Generate filename
    const baseFilename = sanitizeFilename(videoInfo.title || 'video');
    const qualityLabel = quality || '720p';
    const filename = `${baseFilename}_${qualityLabel}.mp4`;

    // YouTube format codes that include both video and audio
    // Using format IDs that are known to work well
    const h264Formats: Record<string, string> = {
      '1080p': '137+140',  // 1080p video + audio (requires merging)
      '720p': '22',        // 720p with audio included
      '360p': '18',        // 360p with audio included
    };

    const requestedQuality = quality || '720p';
    const selectedFormat = formatId || h264Formats[requestedQuality] || h264Formats['720p'];
    // Always use temp file approach for reliability
    const needsMerging = true;

    console.log(`Quality: ${requestedQuality}, Format: ${selectedFormat}`);

    // Always use temp file approach to ensure complete download
    if (true) {
      console.log('Using temp file approach for format that needs merging');
      
      // Create temp file path
      const tempDir = os.tmpdir();
      const tempFileName = `video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
      tempFilePath = path.join(tempDir, tempFileName);

      // Use a more flexible format selection with fallbacks
      let formatString = '';
      if (requestedQuality === '1080p') {
        formatString = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best';
      } else if (requestedQuality === '720p') {
        formatString = 'best[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio/best';
      } else {
        formatString = 'best[height<=360][ext=mp4]/bestvideo[height<=360]+bestaudio/best';
      }
      
      const downloadCommand = `python -m yt_dlp --no-warnings --no-playlist -f "${formatString}" --merge-output-format mp4 --no-check-certificate --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${tempFilePath}" "${url}"`;
      
      console.log('Downloading to temp file:', tempFilePath);

      try {
        await execAsync(downloadCommand, { maxBuffer: 1024 * 1024 * 10 });
        
        // Verify file exists and has content
        const stats = await fs.promises.stat(tempFilePath);
        if (stats.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        // Add a small delay to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const fileStream = fs.createReadStream(tempFilePath);
        
        const headers = new Headers({
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'no-cache',
        });

        const stream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => {
              controller.enqueue(chunk);
            });

            fileStream.on('end', () => {
              controller.close();
              fs.unlink(tempFilePath!, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
              });
            });

            fileStream.on('error', (error) => {
              console.error('File stream error:', error);
              controller.error(error);
              fs.unlink(tempFilePath!, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
              });
            });
          },
          cancel() {
            fileStream.destroy();
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
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw error;
      }
    } else {
      // Direct streaming for single-file formats
      console.log('Using direct streaming for single-file format');
      
      const { spawn } = require('child_process');
      
      const args = [
        '-m', 'yt_dlp',
        '--no-warnings',
        '--no-playlist',
        '--no-check-certificate',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-f', selectedFormat,
        '-o', '-',
        url
      ];
      
      console.log('Executing: python', args.join(' '));
      
      const ytdlpProcess = spawn('python', args, {
        windowsHide: true,
      });

      let errorOutput = '';
      let hasError = false;

      ytdlpProcess.stderr.on('data', (data: Buffer) => {
        const stderr = data.toString();
        errorOutput += stderr;
        
        // Only log non-progress messages
        if (!stderr.includes('[download]') && 
            !stderr.includes('[youtube]') && 
            !stderr.includes('Downloading') &&
            !stderr.includes('WARNING')) {
          console.error('yt-dlp stderr:', stderr);
        }
      });

      ytdlpProcess.on('error', (error: Error) => {
        console.error('Failed to start yt-dlp process:', error);
        hasError = true;
      });

      const headers = new Headers({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      });

      const stream = new ReadableStream({
        start(controller) {
          let dataReceived = false;

          ytdlpProcess.stdout.on('data', (chunk: Buffer) => {
            dataReceived = true;
            controller.enqueue(chunk);
          });

          ytdlpProcess.stdout.on('end', () => {
            if (!hasError) {
              console.log('Stream ended successfully');
              controller.close();
            }
          });

          ytdlpProcess.on('close', (code: number) => {
            if (code !== 0 && code !== null) {
              console.error(`yt-dlp process exited with code ${code}`);
              if (!dataReceived) {
                controller.error(new Error(`Download failed. ${errorOutput}`));
              }
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
    }

  } catch (error) {
    // Clean up temp file on any error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    console.error('Stream API error:', error);
    
    let errorMessage = 'Failed to download video';
    if (error instanceof Error) {
      if (error.message.includes('Requested format is not available')) {
        errorMessage = 'The requested video quality is not available. Try a different quality.';
      } else if (error.message.includes('Video unavailable')) {
        errorMessage = 'This video is unavailable or private';
      } else if (error.message.includes('429')) {
        errorMessage = 'YouTube rate limit reached. Please try again later';
      } else if (error.message.includes('ffmpeg')) {
        errorMessage = 'This video quality requires ffmpeg to be installed. Please try 720p or 360p.';
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
