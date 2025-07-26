import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isValidUrl } from '@/utils/platform-detector';
import { detectPlatform } from '@/utils/platform-detector';
import { sanitizeFilenameForHeaders } from '@/utils/filename-sanitizer';
import { extractVideoInfo } from '@/services/video-extractor';
import { getWindowsCompatibleFormat } from '@/utils/youtube-format-selector';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Helper function to check if file has proper codecs
async function verifyVideoCodecs(filePath: string): Promise<{ hasValidCodecs: boolean; videoCodec?: string; audioCodec?: string }> {
  try {
    const command = `ffprobe -v quiet -print_format json -show_streams "${filePath}"`;
    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);
    
    let videoCodec = '';
    let audioCodec = '';
    
    for (const stream of data.streams) {
      if (stream.codec_type === 'video') {
        videoCodec = stream.codec_name;
      } else if (stream.codec_type === 'audio') {
        audioCodec = stream.codec_name;
      }
    }
    
    // Check for Windows Media Player compatible codecs
    const validVideoCodecs = ['h264', 'avc1'];
    const validAudioCodecs = ['aac', 'mp3'];
    
    const hasValidCodecs = 
      validVideoCodecs.some(codec => videoCodec.includes(codec)) &&
      validAudioCodecs.some(codec => audioCodec.includes(codec));
    
    return { hasValidCodecs, videoCodec, audioCodec };
  } catch (error) {
    console.error('Error verifying codecs:', error);
    return { hasValidCodecs: false };
  }
}

// Request schema
const downloadSchema = z.object({
  url: z.string().url(),
  formatId: z.string().optional(),
  quality: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let tempFile: string | null = null;
  
  try {
    const body = await request.json();
    const validationResult = downloadSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request. Please provide a valid URL.',
        },
        { status: 400 }
      );
    }

    const { url, formatId, quality } = validationResult.data;

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please enter a valid URL' 
        },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);
    
    if (platform === 'unknown' || !['youtube', 'twitter', 'reddit'].includes(platform)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unsupported platform. Please use a YouTube, Twitter, or Reddit video URL.' 
        },
        { status: 400 }
      );
    }

    // Get video info
    let videoInfo;
    let videoTitle = 'video';
    
    try {
      const infoCommand = `python -m yt_dlp --no-warnings --no-playlist --dump-json "${url}"`;
      const { stdout: infoOutput } = await execAsync(infoCommand);
      videoInfo = JSON.parse(infoOutput);
      videoTitle = videoInfo.title || 'video';
    } catch (error) {
      console.error('Failed to get video info:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to retrieve video information.' 
        },
        { status: 404 }
      );
    }

    // Generate filename
    const baseFilename = sanitizeFilenameForHeaders(videoTitle);
    const qualityLabel = quality || formatId || '720p';
    const filename = `${baseFilename}_${qualityLabel}.mp4`;

    // Create temp file
    const tempDir = os.tmpdir();
    tempFile = path.join(tempDir, `download_${Date.now()}.mp4`);

    // Build format string - prioritize Windows-compatible formats
    let formatString;
    let needsConversion = false;
    
    if (formatId) {
      formatString = formatId;
      if (platform === 'youtube' && !formatId.includes('+')) {
        // Ensure we get AAC audio (format 140) not Opus
        formatString = `${formatId}+140`;
        needsConversion = true;
      }
    } else if (platform === 'youtube') {
      // Use optimized format selection for YouTube
      // First, try to get format info to see what's available
      console.log(`Requesting quality: ${quality}`);
      formatString = getWindowsCompatibleFormat(quality);
      needsConversion = formatString.includes('+');
      console.log(`Selected format string: ${formatString}`);
    } else {
      // For other platforms, use simple selection
      const simpleQualityMap: Record<string, string> = {
        '1080p': 'best[height<=1080][ext=mp4]',
        '720p': 'best[height<=720][ext=mp4]',
        '480p': 'best[height<=480][ext=mp4]',
        '360p': 'best[height<=360][ext=mp4]',
      };
      formatString = quality ? (simpleQualityMap[quality] || simpleQualityMap['720p']) : 'best[ext=mp4]';
    }

    console.log(`Format string for ${platform}: ${formatString}`);
    console.log(`Needs conversion: ${needsConversion}`);

    // Step 1: Download video with yt-dlp
    const configPath = path.join(process.cwd(), 'yt-dlp.conf');
    let downloadCommand = `python -m yt_dlp --no-playlist`;
    
    // For YouTube, be very specific about format selection to avoid VP9
    if (platform === 'youtube') {
      // Use strict format selection - no fallbacks to incompatible formats
      downloadCommand += ` -f "${formatString}" --no-video-multistreams`;
      
      // Force re-encoding to ensure H.264/AAC
      downloadCommand += ` --recode-video mp4 --postprocessor-args "VideoConvertor:-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k"`;
    } else {
      downloadCommand += ` -f "${formatString}"`;
    }
    
    downloadCommand += ` -o "${tempFile}" "${url}"`;
    
    console.log('Executing download command...');
    try {
      await execAsync(downloadCommand, { maxBuffer: 1024 * 1024 * 100 }); // 100MB buffer
    } catch (error) {
      console.error('Download command failed:', error);
      throw new Error('Failed to download video. The format might not be available.');
    }

    // Step 2: Verify the downloaded file has proper codecs
    const { hasValidCodecs, videoCodec, audioCodec } = await verifyVideoCodecs(tempFile);
    console.log(`Codec verification - Video: ${videoCodec}, Audio: ${audioCodec}, Valid: ${hasValidCodecs}`);
    
    // Step 3: If codecs are not compatible, re-encode with ffmpeg
    if (!hasValidCodecs) {
      console.log('Invalid codecs detected, re-encoding with ffmpeg...');
      const tempFileReencoded = path.join(tempDir, `download_${Date.now()}_reencoded.mp4`);
      
      // Use ffmpeg to ensure H.264 video and AAC audio
      const ffmpegCommand = `ffmpeg -i "${tempFile}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k -movflags +faststart "${tempFileReencoded}" -y`;
      
      try {
        await execAsync(ffmpegCommand, { maxBuffer: 1024 * 1024 * 100 });
        
        // Replace original file with re-encoded one
        await fs.unlink(tempFile).catch(() => {});
        tempFile = tempFileReencoded;
        
        // Verify again
        const recheck = await verifyVideoCodecs(tempFile);
        console.log(`After re-encoding - Video: ${recheck.videoCodec}, Audio: ${recheck.audioCodec}`);
      } catch (error) {
        console.error('FFmpeg re-encoding failed:', error);
        // Continue with original file
      }
    }

    // Step 4: Read the final file
    const fileBuffer = await fs.readFile(tempFile);
    
    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});
    tempFile = null;

    // Return the file as response
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
    // Clean up temp file if exists
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {});
    }

    console.error('Download error:', error);
    
    let errorMessage = 'Failed to download video';
    if (error instanceof Error) {
      if (error.message.includes('format is not available')) {
        errorMessage = 'The requested video format is not available. Try a different quality.';
      } else if (error.message.includes('Video unavailable')) {
        errorMessage = 'This video is unavailable or private';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit reached. Please try again later.';
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
