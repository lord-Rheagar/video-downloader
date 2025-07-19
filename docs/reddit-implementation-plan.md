# Reddit Video Download Implementation Plan

## Understanding Reddit's Video Hosting

### 1. Reddit Video Types
Reddit hosts videos in several ways:

1. **Native Reddit Video (v.redd.it)**
   - Videos uploaded directly to Reddit
   - Usually split into separate video and audio streams
   - Hosted on v.redd.it domain
   - Requires combining video + audio streams

2. **External Links**
   - YouTube embeds
   - Imgur videos
   - Gfycat/Redgifs
   - Streamable
   - Other external platforms

3. **Reddit Galleries**
   - Multiple images/videos in one post
   - May contain mix of media types

### 2. Technical Challenges

1. **Authentication**
   - Some Reddit content requires authentication
   - Private subreddits
   - NSFW content may need age verification

2. **Video Format**
   - Reddit native videos often use DASH format
   - Separate audio and video streams
   - Different quality options

3. **URL Formats**
   - Old Reddit: reddit.com
   - New Reddit: reddit.com
   - Short links: redd.it
   - Mobile: reddit.app.link

## Implementation Strategy

### Phase 1: Basic Reddit Video Support

1. **URL Validation**
   ```typescript
   - Support multiple Reddit URL formats
   - Extract post ID from URL
   - Handle comments vs direct post links
   ```

2. **Video Detection**
   ```typescript
   - Check if post contains video
   - Identify video type (native vs external)
   - Get video metadata
   ```

3. **Native Video Extraction**
   ```typescript
   - Use yt-dlp for extraction
   - Handle DASH format merging
   - Support quality selection
   ```

### Phase 2: Enhanced Support

1. **External Video Handling**
   - Detect external video platforms
   - Redirect to appropriate extractor
   - Maintain consistent UI

2. **Error Handling**
   - Better error messages for different failure types
   - Handle deleted posts
   - Handle private content

3. **Quality Options**
   - Parse available qualities
   - Default to best quality with audio
   - Allow quality selection

### Phase 3: Advanced Features

1. **Gallery Support**
   - Handle multi-video posts
   - Allow selection of specific videos

2. **Performance**
   - Cache video information
   - Optimize extraction process

## Implementation Details

### 1. Reddit Extractor Structure

```typescript
interface RedditVideoInfo {
  postId: string;
  title: string;
  author: string;
  subreddit: string;
  videoUrl?: string;
  audioUrl?: string;
  thumbnail?: string;
  duration?: number;
  isGallery: boolean;
  isExternal: boolean;
  externalUrl?: string;
  formats: VideoFormat[];
}
```

### 2. URL Pattern Matching

```typescript
const REDDIT_URL_PATTERNS = [
  /reddit\.com\/r\/\w+\/comments\/(\w+)/,
  /redd\.it\/(\w+)/,
  /reddit\.app\.link\/\w+/,
  /reddit\.com\/video\/(\w+)/
];
```

### 3. Video Extraction Flow

1. Parse Reddit URL → Extract post ID
2. Fetch post metadata using yt-dlp
3. Identify video type:
   - Native: Extract v.redd.it URLs
   - External: Get external URL
4. Process based on type:
   - Native: Merge audio/video if needed
   - External: Pass to appropriate extractor
5. Return unified VideoInfo format

### 4. Error Handling Strategy

```typescript
const REDDIT_ERROR_HANDLERS = {
  '404': 'Post not found or has been deleted',
  '403': 'This post is private or restricted',
  'no_video': 'This Reddit post does not contain a video',
  'external': 'Redirecting to external video source',
  'auth_required': 'This content requires Reddit authentication'
};
```

## Testing Strategy

1. **Test URLs**
   - Native video post
   - GIF/video without audio
   - External YouTube link
   - Gallery post
   - Deleted post
   - Private subreddit

2. **Edge Cases**
   - Crossposted videos
   - NSFW content
   - Very long videos
   - Live streams

## Alternative Approaches

### If yt-dlp Reddit extractor has issues:

1. **Reddit API Approach**
   - Use Reddit's JSON API
   - Parse video URLs directly
   - More control but more complex

2. **Hybrid Approach**
   - Use Reddit API for metadata
   - Use yt-dlp for actual download
   - Best of both worlds

3. **Web Scraping**
   - Parse Reddit HTML
   - Extract video URLs
   - Last resort option

## Recommended Implementation Path

1. Start with yt-dlp integration (simplest)
2. Add proper error handling for common cases
3. Test with various Reddit video types
4. Implement fallback to Reddit API if needed
5. Add support for external videos
6. Optimize for performance
