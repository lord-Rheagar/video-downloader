"use client";

import * as React from "react";
import { Download, Youtube, Twitter, Instagram, Facebook } from "lucide-react";
import { VideoInfo as VideoInfoType, VideoFormat, Platform } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoInfoProps {
  videoInfo: VideoInfoType;
  onDownload: (format?: VideoFormat) => void;
  isDownloading?: boolean;
}

const platformIcons: Record<Platform, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  reddit: null,
  unknown: null,
};

const platformColors: Record<Platform, string> = {
  youtube: "bg-red-500",
  twitter: "bg-blue-400",
  instagram: "bg-pink-500",
  facebook: "bg-blue-600",
  reddit: "bg-orange-500",
  unknown: "bg-gray-500",
};

export function VideoInfo({ videoInfo, onDownload, isDownloading = false }: VideoInfoProps) {
  const [selectedFormat, setSelectedFormat] = React.useState<VideoFormat | undefined>(
    videoInfo.formats?.[0]
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 w-full max-w-5xl mx-auto">
      <div className="bg-gray-950/95 backdrop-blur-sm rounded-3xl p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left side - Thumbnail and info */}
          <div className="flex-shrink-0">
            {/* Thumbnail with platform badge */}
            <div className="relative rounded-xl overflow-hidden bg-gray-900 w-80">
              <div className="aspect-video relative">
                {videoInfo.thumbnail ? (
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-gray-600">No thumbnail</div>
                  </div>
                )}
                
                {/* Platform Badge with icon */}
                {videoInfo.platform !== "unknown" && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className={cn(
                      "px-3 py-1.5 rounded-md flex items-center gap-2 backdrop-blur-md",
                      platformColors[videoInfo.platform],
                      "bg-opacity-90"
                    )}>
                      {platformIcons[videoInfo.platform]}
                      <span className="text-white text-sm font-medium capitalize">
                        {videoInfo.platform}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Title and Duration */}
            <div className="mt-4 px-1">
              <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2">
                {videoInfo.title}
              </h3>
              {videoInfo.duration && (
                <div className="text-blue-400 text-sm font-medium mt-2">
                  {formatDuration(videoInfo.duration)}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Format and download */}
          <div className="flex-1 w-full lg:w-auto flex flex-col justify-between min-h-[280px]">
            <div className="space-y-5">
              {/* Single format display with icon and checkmark */}
              {selectedFormat && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Video format icon */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-semibold text-base">
                          MP4 {selectedFormat.quality}
                        </span>
                      </div>
                    </div>
                    
                    {/* File size and checkmark */}
                    <div className="flex items-center gap-4">
                      <span className="text-white font-bold text-lg">
                        {formatFileSize(selectedFormat.size)}
                      </span>
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Format selector - only show if multiple formats */}
              {videoInfo.formats && videoInfo.formats.length > 1 && (
                <div className="space-y-2">
                  {videoInfo.formats.map((format, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedFormat(format)}
                      className={cn(
                        "w-full p-4 rounded-xl border transition-all duration-200",
                        selectedFormat === format
                          ? "bg-blue-500/10 border-blue-500/50 shadow-md"
                          : "bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">MP4 {format.quality}</span>
                        <span className="text-gray-300 font-medium">{formatFileSize(format.size)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* Download button */}
            <div className="mt-auto pt-8">
              <Button
                onClick={() => onDownload(selectedFormat)}
                disabled={isDownloading}
                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-5 px-8 text-base rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                {isDownloading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Downloading...
                  </>
                ) : (
                  "Download"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
