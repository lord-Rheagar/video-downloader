# Twitter Video Download Support

## Overview

The video downloader now supports downloading videos from Twitter/X using yt-dlp as the backend extractor.

## Supported URL Formats

The following Twitter/X URL formats are supported:

- `https://twitter.com/username/status/1234567890123456789`
- `https://x.com/username/status/1234567890123456789`
- Mobile URLs: `https://mobile.twitter.com/username/status/1234567890123456789`

## Features

### Video Information Extraction
- Video title (tweet text)
- Video duration
- Thumbnail image
- Uploader name
- Available quality options

### Quality Options
Twitter videos are typically available in multiple qualities:
- 1080p (if available)
- 720p
- 480p
- 360p
- 240p

The actual available qualities depend on how the video was uploaded to Twitter.

### Download Process
1. User pastes Twitter video URL
2. System extracts video information using yt-dlp
3. Available qualities are displayed
4. User selects desired quality
5. Video is streamed directly to the user's browser

## Technical Implementation

### Backend Components

1. **Twitter Extractor** (`services/extractors/twitter.ts`)
   - Uses yt-dlp to extract video metadata
   - Parses available formats and qualities
   - Returns structured video information

2. **Stream API** (`app/api/stream/route.ts`)
   - Supports both YouTube and Twitter
   - Uses platform-specific format selection
   - Streams video directly without server storage

### Frontend Components

1. **Platform Selector**
   - Twitter icon is displayed with proper branding
   - Twitter is selectable from dropdown

2. **URL Detection**
   - Automatically detects Twitter/X URLs
   - Validates URL format

3. **Video Info Display**
   - Shows Twitter-specific platform badge
   - Displays available quality options

## Error Handling

Common error scenarios and their handling:

1. **Invalid URL**: "Invalid Twitter/X URL format"
2. **No Video**: "This tweet does not contain a video"
3. **Private/Deleted**: "Unable to access this video. It might be private or deleted."
4. **Generic Error**: "Failed to extract Twitter video information"

## Limitations

1. **Protected Accounts**: Videos from protected accounts cannot be downloaded
2. **Age-Restricted Content**: May require additional handling
3. **Live Streams**: Twitter Spaces and live videos are not supported
4. **Rate Limiting**: Subject to Twitter's rate limiting policies

## Usage Example

1. Find a Twitter video you want to download
2. Copy the tweet URL
3. Open the video downloader
4. Select Twitter from the platform dropdown (or it will auto-detect)
5. Paste the URL
6. Click "Get Video"
7. Select your preferred quality
8. Click "Download"

## Testing

To test Twitter video extraction manually:

```bash
# Test with yt-dlp directly
python -m yt_dlp -j "https://twitter.com/username/status/1234567890"

# Run the test script
node test-twitter.js
```

## Future Enhancements

1. **Multiple Videos**: Support for tweets with multiple videos
2. **GIF Support**: Download Twitter GIFs as MP4
3. **Thread Support**: Download all videos from a thread
4. **Metadata**: Include tweet text and metadata in download

## Security Considerations

1. All URLs are validated before processing
2. yt-dlp handles the actual download securely
3. No videos are stored on the server
4. User data is not logged or stored
