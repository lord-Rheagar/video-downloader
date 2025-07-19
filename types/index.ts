export type Platform = 'youtube' | 'twitter' | 'instagram' | 'facebook' | 'reddit' | 'unknown';

export interface VideoInfo {
  title: string;
  duration?: number;
  thumbnail?: string;
  author?: string;
  platform: Platform;
  formats?: VideoFormat[];
}

export interface VideoFormat {
  quality: string;
  format: string;
  size?: number;
  url?: string;
  formatId?: string;
}

export interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
  speed?: number;
  eta?: number;
}

export interface DownloadRequest {
  url: string;
  quality?: string;
  format?: string;
}

export interface DownloadResponse {
  success: boolean;
  message?: string;
  videoInfo?: VideoInfo;
  downloadUrl?: string;
  error?: string;
}
