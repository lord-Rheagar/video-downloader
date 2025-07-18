import { useState } from 'react';
import axios from 'axios';
import { VideoInfo, DownloadResponse } from '@/types';

interface UseVideoDownloadReturn {
  isLoading: boolean;
  error: string | null;
  videoInfo: VideoInfo | null;
  downloadVideo: (url: string) => Promise<void>;
  reset: () => void;
}

export function useVideoDownload(): UseVideoDownloadReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const downloadVideo = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setVideoInfo(null);
    
    try {
      const response = await axios.post<DownloadResponse>('/api/download', { url });
      
      if (response.data.success && response.data.videoInfo) {
        setVideoInfo(response.data.videoInfo);
        setError(null);
      } else {
        setError(response.data.error || 'Failed to extract video information');
        setVideoInfo(null);
      }
    } catch (err) {
      setVideoInfo(null);
      
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
          // Use the error message from the server
          setError(err.response.data.error);
        } else if (err.response?.status === 404) {
          setError('Video not found. Please check the URL and try again.');
        } else if (err.response?.status === 403) {
          setError('Access denied. The video might be private or restricted.');
        } else if (err.response?.status === 429) {
          setError('Too many requests. Please try again later.');
        } else if (!err.response) {
          setError('Network error. Please check your internet connection.');
        } else {
          setError('Failed to process the video. Please try again.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setVideoInfo(null);
  };

  return {
    isLoading,
    error,
    videoInfo,
    downloadVideo,
    reset
  };
}
