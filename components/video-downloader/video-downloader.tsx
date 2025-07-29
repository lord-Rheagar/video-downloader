"use client";

import * as React from "react";
import { AlertCircle, Zap, MousePointerClick, Link2, Settings, Download, ChevronDown, Check } from "lucide-react";
import { PlatformSelector } from "./platform-selector";
import { UrlInput } from "./url-input";
import { DownloadButton } from "./download-button";
import { VideoInfo } from "./video-info";
import { useVideoDownload } from "@/hooks/use-video-download";
import { useVideoStreamDownload } from "@/hooks/use-video-stream-download";
import { Platform, VideoFormat } from "@/types";
import { cn } from "@/lib/utils";
import { detectPlatform } from "@/utils/platform-detector";
import { PLATFORM_CONFIG } from "@/config/platforms";

export function VideoDownloader() {
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  const [url, setUrl] = React.useState("");
  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>("twitter");
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
    
    // Check if platform is YouTube and show coming soon message
    if (detectedPlatform === 'youtube' || selectedPlatform === 'youtube') {
      setDownloadError('YouTube video downloads are coming soon! We\'re working on bringing you the best download experience.');
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
    
    // Check if YouTube URL is entered
    if (platform === 'youtube') {
      setDownloadError('YouTube video downloads are coming soon! We\'re working on bringing you the best download experience.');
      return;
    }
    
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
          Try this unique tool for quick, hassle-free downloads from YouTube, Twitter, and Reddit. 
          Transform your offline video collection with this reliable and efficient downloader.
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
                    Currently, Twitter and Reddit videos are supported. More platforms coming soon!
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

      {/* How It Works Section */}
      <div className="mt-24 space-y-12 animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-gray-500 text-lg">Download videos in 4 simple steps</p>
        </div>
        
        {/* Steps Container */}
        <div className="relative">
          {/* Progress Line - Desktop */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: 1,
                icon: MousePointerClick,
                title: "Select Platform",
                description: "Choose your video platform from the toggle bar above",
                color: "from-blue-500 to-blue-600"
              },
              {
                step: 2,
                icon: Link2,
                title: "Paste URL",
                description: "Copy and paste the video URL into the input field",
                color: "from-purple-500 to-purple-600"
              },
              {
                step: 3,
                icon: Settings,
                title: "Choose Format",
                description: "Select your preferred video quality and format",
                color: "from-pink-500 to-pink-600"
              },
              {
                step: 4,
                icon: Download,
                title: "Download",
                description: "Click download and save to your device",
                color: "from-green-500 to-green-600"
              }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative group animate-in fade-in-0 slide-in-from-bottom-5"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Step Card */}
                  <div className="relative p-6 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/70 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1">
                    {/* Step Number */}
                    <div className="absolute -top-4 left-6 flex items-center justify-center w-8 h-8 bg-gradient-to-r from-gray-900 to-black rounded-full border-2 border-gray-800">
                      <span className="text-sm font-bold text-white">{item.step}</span>
                    </div>
                    
                    {/* Icon Container */}
                    <div className="mb-4">
                      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${item.color} transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-lg font-semibold text-white mb-2 transition-colors duration-300 group-hover:text-blue-400">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                    
                    {/* Decorative Element */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                  
                  {/* Connection Dot - Desktop */}
                  <div className="hidden md:block absolute top-12 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-800 rounded-full border-2 border-gray-700 z-10" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-24 space-y-12 animate-in fade-in-0 slide-in-from-bottom-5 duration-700" style={{ animationDelay: "300ms" }}>
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-500 text-lg">Everything you need to know about our video downloader</p>
        </div>
        
        {/* FAQ Container */}
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            {
              question: "Is this video downloader free?",
              answer: "Yes, our video downloader is completely free to use with no hidden charges.",
              icon: "💸"
            },
            {
              question: "Do I need to install any software?",
              answer: "No, this is a web-based tool that works directly in your browser.",
              icon: "💻"
            },
            {
              question: "What video qualities are available?",
              answer: "We support multiple qualities including 720p, 1080p, and original quality depending on the source.",
              icon: "🎥"
            },
            {
              question: "Can I download private videos?",
              answer: "No, we can only download publicly accessible videos.",
              icon: "🔒"
            },
            {
              question: "Is there a download limit?",
              answer: "No, you can download as many videos as you need.",
              icon: "♾️"
            },
            {
              question: "Which platforms do you support?",
              answer: "Currently Twitter and Reddit. YouTube support coming soon.",
              icon: "🌐"
            },
            {
              question: "Is it safe to use?",
              answer: "Yes, we use secure connections and don't store any user data or downloaded content.",
              icon: "🛡️"
            }
          ].map((faq, index) => {
            const [isOpen, setIsOpen] = React.useState(false);
            
            return (
              <div
                key={index}
                className="group animate-in fade-in-0 slide-in-from-bottom-3"
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                <div
                  className={cn(
                    "relative bg-gray-900/50 backdrop-blur-sm border rounded-2xl transition-all duration-300",
                    isOpen
                      ? "border-blue-500/50 bg-gray-900/70 shadow-xl shadow-blue-500/10"
                      : "border-gray-800 hover:border-gray-700 hover:bg-gray-900/60"
                  )}
                >
                  {/* Question */}
                  <button
                    className="flex items-center justify-between w-full p-6 text-left transition-all duration-200"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <span className="text-2xl transform transition-transform duration-300 group-hover:scale-110">
                        {faq.icon}
                      </span>
                      
                      {/* Question Text */}
                      <span className={cn(
                        "text-lg font-medium transition-colors duration-300",
                        isOpen ? "text-white" : "text-gray-300 group-hover:text-white"
                      )}>
                        {faq.question}
                      </span>
                    </div>
                    
                    {/* Chevron Icon */}
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-gray-400 transition-all duration-300",
                        isOpen ? "rotate-180 text-blue-400" : "group-hover:text-gray-300"
                      )}
                    />
                  </button>
                  
                  {/* Answer */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-500 ease-in-out",
                      isOpen ? "max-h-40" : "max-h-0"
                    )}
                  >
                    <div className="px-6 pb-6">
                      <div className="flex items-start gap-4">
                        {/* Checkmark */}
                        <div className="mt-1">
                          <div className="flex items-center justify-center w-5 h-5 bg-green-500/20 rounded-full">
                            <Check className="w-3 h-3 text-green-400" />
                          </div>
                        </div>
                        
                        {/* Answer Text */}
                        <p className="text-gray-400 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative gradient line */}
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent transition-opacity duration-500",
                      isOpen ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Additional Help Text */}
        <div className="text-center mt-12">
          <p className="text-gray-500">
            Still have questions?{" "}
            <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
              Contact support
            </a>
          </p>
        </div>
      </div>

    </div>
  );
}
