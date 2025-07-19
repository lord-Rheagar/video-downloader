import { NextRequest, NextResponse } from 'next/server';
import { extractVideoInfo } from '@/services/video-extractor';

export async function POST(request: NextRequest) {
  console.log('Test download endpoint hit');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { url } = body;
    console.log('URL to process:', url);
    
    // Test the video extraction
    console.log('Starting video extraction...');
    const videoInfo = await extractVideoInfo(url);
    console.log('Video extraction successful:', videoInfo);
    
    return NextResponse.json({
      success: true,
      videoInfo,
      debug: {
        timestamp: new Date().toISOString(),
        url: url,
        platform: videoInfo.platform
      }
    });
    
  } catch (error) {
    console.error('Test download error - Full error object:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name || 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      debug: {
        timestamp: new Date().toISOString(),
        body: await request.text().catch(() => 'Could not read body')
      }
    }, { status: 500 });
  }
}
