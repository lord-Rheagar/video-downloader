"use client";

import * as React from "react";
import { AlertCircle, Zap } from "lucide-react";
import { PlatformSelector } from "./platform-selector";
import { UrlInput } from "./url-input";
import { DownloadButton } from "./download-button";
import { VideoInfo } from "./video-info";
import { useVideoDownload } from "@/hooks/use-video-download";
import { useVideoStreamDownload } from "@/hooks/use-video-stream-download";
import { Platform, VideoFormat } from "@/types";
import { cn } from "@/lib/utils";
import { detectPlatform } from "@/utils/platform-detector";

export function VideoDownloader() {
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  const [url, setUrl] = React.useState("");
  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>("youtube");
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = React.useState(false);
  const { isLoading, error, videoInfo, downloadVideo, reset } = useVideoDownload();
  
  // Hook for streaming downloads
  const { downloadVideo: streamDownload, isDownloading } = useVideoStreamDownload({
    url: videoInfo?.url || url,
    onError: (error) => {
      // Check if this is an alternatives message
      if (error.includes('YouTube is blocking')) {
        setShowAlternatives(true);
      } else {
        setDownloadError(error);
        // Clear error after 5 seconds
        setTimeout(() => setDownloadError(null), 5000);
      }
    },
    onSuccess: () => {
      // Could show success message here
      setShowAlternatives(false);
    },
  });

  const handleDownload = async () => {
    if (!url) return;
    
    // Validate URL matches selected platform
    const detectedPlatform = detectPlatform(url);
    if (detectedPlatform !== selectedPlatform && detectedPlatform !== 'unknown') {
      setDownloadError(`URL does not match selected platform. Expected ${selectedPlatform} URL but got ${detectedPlatform} URL.`);
      return;
    }
    
    await downloadVideo(url);
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (!newUrl) {
      reset();
      setDownloadError(null); // Clear error when URL is cleared
      return;
    }
    // Validate URL against selected platform
    const platform = detectPlatform(newUrl);
    if (platform !== selectedPlatform && platform !== 'unknown') {
      setDownloadError(`Selected platform does not match URL. Please provide a valid ${selectedPlatform} URL.`);
    } else {
      setDownloadError(null);
    }
  };

  const handlePlatformDetected = (platform: Platform) => {
    if (platform !== "unknown") {
      setSelectedPlatform(platform);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold">
          <span className="text-white">Video </span>
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Downloader
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Try this unique tool for quick, hassle-free downloads from YouTube, Twitter, Instagram, 
          Facebook, and Reddit. Transform your offline video collection with this reliable and efficient downloader.
        </p>
        
        {/* Copyright Notice */}
        <div className="flex items-center justify-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 max-w-2xl mx-auto">
          <Zap className="h-5 w-5" />
          <p className="text-sm">
            WE DO NOT ALLOW/SUPPORT THE DOWNLOAD OF COPYRIGHTED MATERIAL!
          </p>
        </div>
      </div>

      {/* Main Controls */}
      <div className="space-y-6">
        {/* Platform Selector and URL Input Row */}
        {isClient &&
        <div className="flex flex-col md:flex-row gap-4">
          <PlatformSelector
            value={selectedPlatform}
            onChange={setSelectedPlatform}
          />
          <div className="flex-1">
            <UrlInput
              value={url}
              onChange={handleUrlChange}
              onPlatformDetected={handlePlatformDetected}
              selectedPlatform={selectedPlatform}
              disabled={isLoading}
            />
          </div>
        </div>}

        {/* Download Button - Only show when no video info */}
        {!videoInfo && (
          <div className="flex justify-center">
            <DownloadButton
              onClick={handleDownload}
              isLoading={isLoading}
              isSuccess={!!videoInfo && !isLoading}
              disabled={!url || !!error || !!downloadError}
              size="lg"
            />
          </div>
        )}

        {/* Error Message */}
        {(error || downloadError) && (
          <div className="animate-in fade-in-0 slide-in-from-top-1 duration-300">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-500 mb-1">Error</h4>
                <p className="text-sm text-red-400">{error || downloadError}</p>
                {error && error.includes('coming soon') && (
                  <p className="text-xs text-gray-400 mt-2">
                    Currently, YouTube and Twitter videos are supported. More platforms coming soon!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Video Info Display */}
        {videoInfo && !error && (
          <VideoInfo
            videoInfo={videoInfo}
            onDownload={(format) => {
              // Clear any previous download errors
              setDownloadError(null);
              setShowAlternatives(false);
              // Trigger the download
              streamDownload(format);
            }}
            isDownloading={isDownloading}
            showAlternatives={showAlternatives}
            onCloseAlternatives={() => setShowAlternatives(false)}
          />
        )}
      </div>

    </div>
  );
}
