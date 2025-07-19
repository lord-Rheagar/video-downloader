const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRedditAPI() {
  const testUrls = [
    'https://www.reddit.com/r/funny/comments/1m3qnm2/caught_during_a_savannah_bananas_baseball_game/',
    'https://www.reddit.com/r/funny/comments/1m3vi3l/man_takes_a_picture_everyday_from_age_5_to_30/',
    'https://www.reddit.com/r/funny/comments/1m3x2u0/patrick_got_tired_that_day/'
  ];
  
  console.log('Testing Reddit video extraction through the API...\n');
  
  for (const url of testUrls) {
    console.log('=' + '='.repeat(80));
    console.log('Testing URL:', url);
    console.log('=' + '='.repeat(80));
    
    try {
      const response = await fetch('http://localhost:3000/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('\n✓ Success!');
        console.log('\nVideo Info:');
        console.log('- Title:', data.videoInfo.title);
        console.log('- Author:', data.videoInfo.author);
        console.log('- Duration:', data.videoInfo.duration, 'seconds');
        console.log('- Platform:', data.videoInfo.platform);
        
        console.log('\nAvailable Formats:');
        data.videoInfo.formats?.forEach(format => {
          console.log(`  - ${format.quality} (${format.format})`);
          if (format.audioUrl) {
            console.log('    Has separate audio track');
          }
        });
      } else {
        console.error('\n✗ Error:', data.error);
      }
      
    } catch (error) {
      console.error('\n✗ Failed to connect to API:', error.message);
      console.log('Make sure the Next.js dev server is running (npm run dev)');
    }
    
    console.log('\n');
  }
}

// Run the test
testRedditAPI();
