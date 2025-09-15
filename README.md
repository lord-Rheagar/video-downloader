# 🎥 Video Downloader

A modern, sleek video downloader application built with Next.js 14+, TypeScript, and Tailwind CSS. Download videos from multiple platforms with a beautiful, user-friendly interface.

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Features

### 🎯 Core Functionality
- **Multi-Platform Support**: Currently supports Reddit and Twitter, with more platforms coming soon
- **Smart URL Detection**: Automatically detects the video platform from the URL
- **Video Information Extraction**: Retrieves video title, duration, thumbnail, and available formats
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 🎨 User Interface
- **Modern Dark Theme**: Sleek dark interface with gradient accents
- **Animated Components**: Smooth transitions and loading states
- **Real-time Validation**: Instant feedback on URL validity
- **Platform Selector**: Dropdown menu with platform icons and status indicators
- **Progress Feedback**: Visual loading states and success confirmations

### 🔧 Technical Features
- **Type-Safe**: Full TypeScript implementation
- **API Routes**: Next.js API routes for backend processing
- **Component Architecture**: Modular and reusable components
- **Custom Hooks**: React hooks for state management
- **Error Boundaries**: Graceful error handling throughout the app

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)

### Backend
- **API**: Next.js API Routes
- **Video Processing**: [ytdl-core](https://github.com/fent/node-ytdl-core) (YouTube)
- **Validation**: [Zod](https://zod.dev/)

## 📁 Project Structure

```
video-downloader/
├── app/                           # Next.js App Router
│   ├── api/                       # API routes
│   │   └── download/              # Video download endpoint
│   │       └── route.ts           # POST endpoint for video processing
│   ├── layout.tsx                 # Root layout with metadata
│   ├── page.tsx                   # Home page with gradient background
│   └── globals.css                # Global styles and animations
│
├── components/                    # React components
│   ├── ui/                        # Base UI components (shadcn/ui)
│   │   ├── button.tsx             # Button component with variants
│   │   ├── input.tsx              # Input component
│   │   └── progress.tsx           # Progress bar component
│   │
│   └── video-downloader/          # Feature-specific components
│       ├── video-downloader.tsx   # Main component container
│       ├── platform-selector.tsx  # Platform dropdown selector
│       ├── url-input.tsx          # URL input with validation
│       ├── download-button.tsx    # Download button with states
│       └── index.ts               # Component exports
│
├── config/                        # Configuration files
│   └── platforms.ts               # Platform configurations and metadata
│
├── hooks/                         # Custom React hooks
│   └── use-video-download.ts      # Hook for video download logic
│
├── lib/                           # Core utilities
│   └── utils.ts                   # Utility functions (cn helper)
│
├── services/                      # Business logic services
│   ├── extractors/                # Platform-specific extractors
│   │   └── youtube.ts             # YouTube video extractor
│   └── video-extractor.ts         # Main extractor service
│
├── types/                         # TypeScript definitions
│   └── index.ts                   # Shared type definitions
│
├── utils/                         # Utility functions
│   └── platform-detector.ts       # URL parsing and platform detection
│
├── public/                        # Static assets
├── .env.example                   # Environment variables template
├── components.json                # shadcn/ui configuration
├── next.config.ts                 # Next.js configuration
├── package.json                   # Dependencies and scripts
├── tailwind.config.ts             # Tailwind CSS configuration
└── tsconfig.json                  # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher
- **Operating System**: Windows, macOS, or Linux

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/video-downloader.git
   cd video-downloader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## 📖 Usage Guide

### Basic Usage

1. **Select Platform** (Optional): Choose the video platform from the dropdown
2. **Enter URL**: Paste the video URL in the input field
3. **Validation**: The app will validate the URL and auto-detect the platform
4. **Download**: Click the "Download" button to process the video
5. **View Results**: See video information and download options

### Supported URL Formats

#### YouTube
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

#### Other Platforms (Coming Soon)
- Twitter/X
- Reddit

## 🔌 API Reference

### POST `/api/download`

Extracts video information from a given URL.

#### Request Body
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "quality": "1080p",  // optional
  "format": "mp4"      // optional
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "videoInfo": {
    "title": "Video Title",
    "duration": 300,
    "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg",
    "author": "Channel Name",
    "platform": "youtube",
    "formats": [
      {
        "quality": "1080p",
        "format": "mp4",
        "size": 104857600,
        "url": "https://..."
      }
    ]
  },
  "message": "Video information extracted successfully"
}
```

#### Error Response (400/404/500)
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

## 🎨 Component Documentation

### VideoDownloader
Main container component that orchestrates the video downloading functionality.

### PlatformSelector
Dropdown component for selecting video platforms.
- Props: `value`, `onChange`
- Features: Auto-close, animations, platform icons

### UrlInput
Input component with built-in URL validation.
- Props: `value`, `onChange`, `onPlatformDetected`, `disabled`
- Features: Real-time validation, clear button, platform detection

### DownloadButton
Animated button component with loading states.
- Props: `onClick`, `isLoading`, `isSuccess`, `disabled`, `size`
- Features: Loading spinner, success checkmark, hover effects

## 🔐 Security Considerations

- **URL Validation**: All URLs are validated before processing
- **Error Handling**: Sensitive error information is not exposed to users
- **Rate Limiting**: Consider implementing rate limiting in production
- **CORS**: Properly configured for API routes

## 🐛 Troubleshooting

### Common Issues

1. **"Platform not supported" error**
   - Currently, only YouTube is supported
   - Other platforms are coming soon

2. **"Video unavailable" error**
   - Check if the video is private or age-restricted
   - Verify the URL is correct

3. **Network errors**
   - Check your internet connection
   - Ensure the video platform is accessible

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚖️ Legal Disclaimer

**Important**: This tool is for educational purposes only. Users are responsible for:
- Respecting copyright laws
- Following platform terms of service
- Obtaining necessary permissions before downloading content
- Using downloaded content legally and ethically

We do not support or condone the downloading of copyrighted material without permission.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) team for the amazing framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful components
- [ytdl-core](https://github.com/fent/node-ytdl-core) for YouTube video extraction
- All contributors and users of this project

---

<p align="center">Made with ❤️ by developers for developers</p>
