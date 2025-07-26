import { useState } from 'react';
import { VideoFormat } from '@/types';
import { detectPlatform } from '@/utils/platform-detector';

interface UseVideoStreamDownloadProps {
  url: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  onProgress?: (message: string) => void;
}

export function useVideoStreamDownload({ url, onError, onSuccess, onProgress }: UseVideoStreamDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('');

  const downloadVideo = async (format?: VideoFormat) => {
    if (!url || isDownloading) return;

    setIsDownloading(true);
    setDownloadStatus('Preparing download...');
    onProgress?.('Preparing download...');

    try {
      // Prepare request body
      const requestBody = {
        url,
        quality: format?.quality,
        formatId: format?.formatId,
      };

      // Detect platform
      const platform = detectPlatform(url);
      
      // Try Windows-compatible download endpoint first
      let response = await fetch('/api/download-windows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          quality: format?.quality || '720p'
        }),
      });

      // If simple download fails, try download-file endpoint
      if (!response.ok) {
        console.log('Simple download failed, trying download-file endpoint...');
        onProgress?.('Trying alternative download method...');
        
        response = await fetch('/api/download-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }
      
      // If download-file fails, try streaming endpoint
      if (!response.ok) {
        console.log('Download-file endpoint failed, trying stream endpoint...');
        onProgress?.('Trying streaming download method...');
        
        response = await fetch('/api/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }

      // Only try additional fallback endpoints for YouTube videos
      if (platform === 'youtube' && !response.ok) {
        // If stream endpoint fails with 403/404, try fallback
        if (response.status === 403 || response.status === 404) {
          console.log('Stream endpoint failed, trying fallback...');
          onProgress?.('Trying alternative download method...');
          
          response = await fetch('/api/stream-fallback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
        }

        // If fallback also fails, try direct-download
        if (!response.ok) {
          console.log('Fallback failed, trying direct-download...');
          onProgress?.('Attempting direct-download method...');

          response = await fetch('/api/direct-download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
        }
      }

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Download failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Check if this is a direct-download response with alternatives
      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        if (data.alternatives) {
          // This is the direct-download endpoint response with alternatives
          const alternativesMessage = [
            'YouTube is blocking automated downloads. Please try:',
            ...data.alternatives.map((alt: string) => `• ${alt}`)
          ].join('\n');
          
          onError?.(alternativesMessage);
          return;
        }
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'video.mp4';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create a download link and trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);

      onSuccess?.();
    } catch (error) {
      console.error('Download error:', error);
      onError?.(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    downloadVideo,
    isDownloading,
  };
}
