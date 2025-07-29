import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface AlternativeDownloadProps {
  videoId?: string;
  quality?: string;
  onClose?: () => void;
}

export function AlternativeDownload({ videoId, quality, onClose }: AlternativeDownloadProps) {
  const alternatives = [
    {
      title: 'Browser Extensions',
      description: 'Use browser extensions for direct downloads',
      options: [
        { name: 'Video DownloadHelper', url: 'https://www.downloadhelper.net/' },
        { name: 'Easy Youtube Video Downloader', url: 'https://www.easyvideodownloader.com/' }
      ]
    },
    {
      title: 'Online Services',
      description: 'Alternative online download services',
      options: [
        { name: 'Y2mate', url: 'https://www.y2mate.com/' },
        { name: 'SaveFrom.net', url: 'https://en.savefrom.net/' },
        { name: 'KeepVid', url: 'https://keepvid.com/' }
      ]
    },
    {
      title: 'Other Solutions',
      description: 'Additional methods to try',
      options: [
        { name: 'Use a VPN service', url: null },
        { name: 'Try again later (wait a few hours)', url: null },
        { name: 'Use a different network/IP', url: null }
      ]
    }
  ];

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            YouTube Downloads Coming Soon!
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            YouTube video downloads are coming soon! We're working on bringing you the best 
            download experience. Stay tuned!
          </p>
        </div>
      </div>

      <div className="space-y-6 mt-6">
        {alternatives.map((category, idx) => (
          <div key={idx}>
            <h4 className="font-medium text-gray-900 mb-1">{category.title}</h4>
            <p className="text-sm text-gray-600 mb-3">{category.description}</p>
            <div className="space-y-2">
              {category.options.map((option, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">•</span>
                  {option.url ? (
                    <a
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {option.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-gray-700">{option.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {videoId && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-600">
            Video ID: <code className="bg-gray-200 px-1 py-0.5 rounded">{videoId}</code>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Requested Quality: <code className="bg-gray-200 px-1 py-0.5 rounded">{quality || '720p'}</code>
          </p>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      )}
    </div>
  );
}
