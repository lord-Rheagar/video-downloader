import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractVideoInfo } from '@/services/video-extractor';
import { isValidUrl } from '@/utils/platform-detector';

const downloadSchema = z.object({
  url: z.string().url(),
  quality: z.string().optional(),
  format: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = downloadSchema.safeParse(body);
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

    const { url } = validationResult.data;

    // Additional URL validation
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please enter a valid URL (e.g., https://www.youtube.com/watch?v=...)' 
        },
        { status: 400 }
      );
    }

    // Extract video information
    const videoInfo = await extractVideoInfo(url);

    return NextResponse.json({
      success: true,
      videoInfo,
      message: 'Video information extracted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Download API error:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Set appropriate status codes based on error type
      if (error.message.includes('coming soon') || 
          error.message.includes('not from a supported') ||
          error.message.includes('Please enter a valid URL')) {
        statusCode = 400;
      } else if (error.message.includes('unavailable') || 
                 error.message.includes('private')) {
        statusCode = 404;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: statusCode }
    );
  }
}
