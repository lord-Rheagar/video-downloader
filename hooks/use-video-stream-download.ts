import { useState } from 'react';
import { VideoFormat } from '@/types';

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

      // Try main endpoint first
      let response = await fetch('/api/stream-hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // If main endpoint fails with 403/404, try fallback
      if (!response.ok && (response.status === 403 || response.status === 404)) {
        console.log('Main endpoint failed, trying fallback...');
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
