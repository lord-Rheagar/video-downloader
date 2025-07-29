import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isValidUrl } from '@/utils/platform-detector';
import { detectPlatform } from '@/utils/platform-detector';
import { sanitizeFilenameForHeaders } from '@/utils/filename-sanitizer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const downloadSchema = z.object({
  url: z.string().url(),
  quality: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let tempFileOriginal: string | null = null;
  let tempFileConverted: string | null = null;
  
  try {
    const body = await request.json();
    const validationResult = downloadSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { url, quality } = validationResult.data;

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);
    
    if (!['youtube', 'twitter', 'reddit'].includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported platform' },
        { status: 400 }
      );
    }

    // Get video info
    let videoTitle = 'video';
    try {
      const infoCommand = `python -m yt_dlp --no-warnings --get-title "${url}"`;
      const { stdout } = await execAsync(infoCommand);
      videoTitle = stdout.trim() || 'video';
    } catch (error) {
      console.error('Failed to get title:', error);
    }

    // Generate filename
    const baseFilename = sanitizeFilenameForHeaders(videoTitle);
    const qualityLabel = quality || '720p';
    const filename = `${baseFilename}_${qualityLabel}.mp4`;

    // Create temp files
    const tempDir = os.tmpdir();
    tempFileOriginal = path.join(tempDir, `download_${Date.now()}_original.mp4`);
    tempFileConverted = path.join(tempDir, `download_${Date.now()}_converted.mp4`);

    // Step 1: Download the video without any conversion
    let downloadCommand = `python -m yt_dlp --no-warnings --no-playlist`;
    
    if (platform === 'youtube') {
      // For YouTube, try to get pre-muxed H.264 formats first
      if (quality === '720p') {
        downloadCommand += ` -f "22/best[height<=720]"`;
      } else if (quality === '360p') {
        downloadCommand += ` -f "18/best[height<=360]"`;
      } else if (quality === '1080p') {
        downloadCommand += ` -f "best[height<=1080]"`;
      } else {
        downloadCommand += ` -f "best[height<=720]"`;
      }
    } else if (platform === 'reddit') {
      // For Reddit, use bestvideo+bestaudio to ensure we get both streams
      downloadCommand += ` -f "bestvideo+bestaudio/best"`;
    } else {
      downloadCommand += ` -f "best"`;
    }
    
    downloadCommand += ` -o "${tempFileOriginal}" "${url}"`;
    
    console.log('Step 1: Downloading video...');
    await execAsync(downloadCommand, { maxBuffer: 1024 * 1024 * 100 });

    // Step 2: Convert with very specific Windows-compatible settings
    // Optimized for lower memory usage on Railway
    const ffmpegCommand = `ffmpeg -i "${tempFileOriginal}" ` +
      `-c:v libx264 ` +                    // Use H.264 codec
      `-preset ultrafast ` +                // Fastest preset to reduce memory usage
      `-profile:v baseline ` +              // Baseline profile for compatibility
      `-level:v 3.0 ` +                     // Level 3.0
      `-pix_fmt yuv420p ` +                 // Pixel format
      `-refs 1 ` +                          // Reference frames
      `-crf 28 ` +                          // Slightly lower quality for less memory
      `-bf 0 ` +                            // No B-frames
      `-threads 1 ` +                       // Single thread to reduce memory
      `-movflags +faststart ` +             // Fast start for web
      `-c:a aac ` +                         // AAC audio
      `-b:a 128k ` +                        // Audio bitrate
      `-ar 44100 ` +                        // Audio sample rate
      `-ac 2 ` +                            // Stereo audio
      `-strict experimental ` +             // Allow experimental features
      `-f mp4 ` +                           // Force MP4 format
      `"${tempFileConverted}" -y`;

    console.log('Step 2: Converting to Windows-compatible format...');
    await execAsync(ffmpegCommand, { maxBuffer: 1024 * 1024 * 100 });

    // Clean up original file
    await fs.unlink(tempFileOriginal).catch(() => {});
    tempFileOriginal = null;

    // Read the converted file
    const fileBuffer = await fs.readFile(tempFileConverted);
    
    // Clean up converted file
    await fs.unlink(tempFileConverted).catch(() => {});
    tempFileConverted = null;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    // Clean up any remaining files
    if (tempFileOriginal) {
      await fs.unlink(tempFileOriginal).catch(() => {});
    }
    if (tempFileConverted) {
      await fs.unlink(tempFileConverted).catch(() => {});
    }

    console.error('Download error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to download video' },
      { status: 500 }
    );
  }
}
