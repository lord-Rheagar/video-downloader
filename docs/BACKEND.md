# Backend Download Functionality

## Overview

The backend download functionality provides a secure and efficient way to stream YouTube videos directly to the user's browser. It integrates with yt-dlp for reliable video extraction and download.

## Architecture

### API Endpoints

#### `/api/download` (POST)
- **Purpose**: Extract video information from a given URL
- **Input**: `{ url: string }`
- **Output**: Video metadata including available formats

#### `/api/stream` (POST)
- **Purpose**: Stream video file to browser for download
- **Input**: 
  ```json
  {
    "url": "string",
    "quality": "1080p | 720p | 360p",
    "formatId": "string (optional)"
  }
  ```
- **Output**: Video file stream with proper headers

## Key Features

### 1. Format Selection
- Supports multiple quality options (1080p, 720p, 360p)
- Format ID support for precise format selection
- Automatic fallback to best available format

### 2. Streaming Implementation
- Direct streaming from YouTube to user (no server storage)
- Efficient memory usage for large files
- Proper content headers for browser download

### 3. Security Features
- Input validation using Zod schemas
- URL sanitization
- Rate limiting (10 downloads per hour per IP)
- Platform restriction (YouTube only currently)

### 4. Error Handling
- Comprehensive error messages
- Specific handling for:
  - Private/unavailable videos
  - Invalid URLs
  - Rate limit exceeded
  - Format not available
  - Network errors

### 5. File Naming
- Automatic filename generation from video title
- Special character sanitization
- OS-compatible filenames
- Quality suffix included

## Technical Implementation

### Dependencies
- **yt-dlp**: Core video extraction tool
- **zod**: Request validation
- **Next.js API Routes**: Server implementation

### Stream Flow
1. Client sends download request with URL and format
2. Server validates request and checks rate limit
3. yt-dlp extracts direct video URL
4. Server fetches video stream from YouTube
5. Stream is piped directly to client response
6. Browser receives file with proper download headers

### Rate Limiting
- Simple in-memory storage (suitable for single-instance)
- IP-based tracking
- Automatic cleanup of expired entries
- Configurable limits

## Setup Requirements

### 1. Install yt-dlp
Run the setup script:
```bash
npm run setup
```

Or install manually:
- **Windows**: Download from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- **macOS**: `brew install yt-dlp`
- **Linux**: `sudo pip install yt-dlp`

### 2. Environment Configuration
No specific environment variables required for basic functionality.

## Usage Example

```typescript
// Frontend implementation
const response = await fetch('/api/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://youtube.com/watch?v=...',
    quality: '720p'
  }),
});

const blob = await response.blob();
// Handle download...
```

## Error Responses

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common status codes:
- `400`: Invalid request/URL
- `404`: Video not found/unavailable
- `429`: Rate limit exceeded
- `500`: Server error

## Future Enhancements

1. **Progress Tracking**: WebSocket connection for download progress
2. **Resume Support**: Partial content/range requests
3. **Multi-Platform**: Support for Twitter, Reddit, etc.
4. **CDN Integration**: For better performance
5. **Database Storage**: For persistent rate limiting
6. **User Authentication**: For personalized limits
7. **Batch Downloads**: Multiple videos at once
8. **Format Conversion**: On-the-fly format conversion

## Security Considerations

1. **Input Validation**: All inputs are validated before processing
2. **Rate Limiting**: Prevents abuse and server overload
3. **No Storage**: Videos are never stored on server
4. **HTTPS Only**: Should be deployed with HTTPS
5. **Content Security**: Respects video platform restrictions
