const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testReddit() {
  // Try a very simple Reddit URL
  const url = 'https://www.reddit.com/r/funny.json?limit=5';
  
  try {
    console.log('Fetching:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\nFound posts:');
      
      data.data.children.forEach((post, index) => {
        const postData = post.data;
        console.log(`\n${index + 1}. ${postData.title}`);
        console.log(`   URL: https://reddit.com${postData.permalink}`);
        console.log(`   Is Video: ${postData.is_video}`);
        if (postData.is_video && postData.secure_media?.reddit_video) {
          console.log('   ✓ Has Reddit video!');
          console.log(`   Video URL: ${postData.secure_media.reddit_video.fallback_url}`);
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testReddit();
