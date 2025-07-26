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
  let tempFile: string | null = null;
  
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

    // Create temp file
    const tempDir = os.tmpdir();
    tempFile = path.join(tempDir, `download_${Date.now()}.mp4`);

    // Simple approach: Download best available and always re-encode to H.264/AAC
    // This ensures 100% compatibility with Windows Media Player
    let downloadCommand = `python -m yt_dlp --no-warnings --no-playlist`;
    
    // Select quality
    if (quality === '1080p') {
      downloadCommand += ` -f "best[height<=1080]/best"`;
    } else if (quality === '720p') {
      downloadCommand += ` -f "best[height<=720]/best"`;
    } else if (quality === '480p') {
      downloadCommand += ` -f "best[height<=480]/best"`;
    } else if (quality === '360p') {
      downloadCommand += ` -f "best[height<=360]/best"`;
    } else {
      downloadCommand += ` -f "best"`;
    }
    
    // Always re-encode to ensure compatibility (H.264 Baseline Profile)
    downloadCommand += ` --recode-video mp4`;
    downloadCommand += ` --postprocessor-args "VideoConvertor:-c:v libx264 -profile:v baseline -level 3.0 -crf 23 -c:a aac -b:a 128k -movflags +faststart"`;
    downloadCommand += ` -o "${tempFile}" "${url}"`;
    
    console.log('Executing simplified download with forced H.264/AAC encoding...');
    await execAsync(downloadCommand, { maxBuffer: 1024 * 1024 * 100 });

    // Read and serve the file
    const fileBuffer = await fs.readFile(tempFile);
    
    // Clean up
    await fs.unlink(tempFile).catch(() => {});
    tempFile = null;

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
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {});
    }

    console.error('Download error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to download video' },
      { status: 500 }
    );
  }
}
