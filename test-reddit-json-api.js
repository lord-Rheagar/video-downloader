const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRedditJsonAPI(url) {
  try {
    console.log(`Testing Reddit URL: ${url}`);
    
    // Validate Reddit URL format
    if (!url.includes('reddit.com')) {
      throw new Error('Invalid Reddit URL');
    }

    // Append .json to get JSON response
    const redditJsonUrl = `${url}.json`;
    console.log(`Fetching from: ${redditJsonUrl}`);
    
    const response = await fetch(redditJsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch Reddit metadata: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Navigate through Reddit's JSON structure
    const postData = data[0]?.data?.children[0]?.data;
    
    if (!postData) {
      console.log('No post data found');
      return;
    }

    console.log('\n--- Post Information ---');
    console.log(`Title: ${postData.title}`);
    console.log(`Author: ${postData.author}`);
    console.log(`Subreddit: ${postData.subreddit}`);
    console.log(`Is Video: ${postData.is_video}`);
    console.log(`URL: ${postData.url}`);
    
    if (postData.is_video && postData.secure_media?.reddit_video) {
      const redditVideo = postData.secure_media.reddit_video;
      console.log('\n--- Video Information ---');
      console.log(`Duration: ${redditVideo.duration} seconds`);
      console.log(`Width: ${redditVideo.width}`);
      console.log(`Height: ${redditVideo.height}`);
      console.log(`Video URL: ${redditVideo.fallback_url}`);
      console.log(`HLS URL: ${redditVideo.hls_url}`);
      console.log(`DASH URL: ${redditVideo.dash_url}`);
      console.log(`Has Audio: ${redditVideo.has_audio}`);
      
      // Check for audio URL
      const videoBaseUrl = redditVideo.fallback_url.substring(0, redditVideo.fallback_url.lastIndexOf('/'));
      const audioUrl = `${videoBaseUrl}/DASH_audio.mp4`;
      console.log(`Potential Audio URL: ${audioUrl}`);
      
      // Try to fetch audio to check if it exists
      try {
        const audioResponse = await fetch(audioUrl, { method: 'HEAD' });
        console.log(`Audio exists: ${audioResponse.ok}`);
      } catch (e) {
        console.log('Could not check audio URL');
      }
    } else {
      console.log('\nThis post does not contain a Reddit-hosted video');
      
      // Check if it's a crosspost or external video
      if (postData.crosspost_parent_list && postData.crosspost_parent_list.length > 0) {
        console.log('This is a crosspost');
        const crosspost = postData.crosspost_parent_list[0];
        if (crosspost.is_video && crosspost.secure_media?.reddit_video) {
          console.log('Original post contains video');
        }
      }
      
      if (postData.url_overridden_by_dest) {
        console.log(`External URL: ${postData.url_overridden_by_dest}`);
      }
    }
    
    // Check for preview images
    if (postData.preview?.images?.length > 0) {
      console.log('\n--- Preview Images ---');
      console.log(`Thumbnail: ${postData.thumbnail}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// Test with different Reddit video URLs
const testUrls = [
  'https://www.reddit.com/r/funny/comments/1m3qnm2/caught_during_a_savannah_bananas_baseball_game/',
  'https://www.reddit.com/r/funny/comments/1m3vi3l/man_takes_a_picture_everyday_from_age_5_to_30/',
  'https://www.reddit.com/r/funny/comments/1m3x2u0/patrick_got_tired_that_day/'
];

// Run tests
(async () => {
  for (const url of testUrls) {
    console.log('\n' + '='.repeat(80) + '\n');
    await testRedditJsonAPI(url);
  }
})();
