// Test the Reddit extractor service
const path = require('path');
const { pathToFileURL } = require('url');

async function testRedditExtractor() {
  try {
    // Import the extractor using dynamic import with file URL
    const extractorPath = path.resolve('./services/extractors/reddit.ts');
    const { extractRedditVideo } = await import(pathToFileURL(extractorPath).href);
    
    const testUrls = [
      'https://www.reddit.com/r/funny/comments/1m3qnm2/caught_during_a_savannah_bananas_baseball_game/',
      'https://www.reddit.com/r/funny/comments/1m3vi3l/man_takes_a_picture_everyday_from_age_5_to_30/',
      'https://www.reddit.com/r/funny/comments/1m3x2u0/patrick_got_tired_that_day/'
    ];
    
    for (const url of testUrls) {
      console.log('\n' + '='.repeat(80));
      console.log('Testing URL:', url);
      console.log('='.repeat(80));
      
      try {
        const videoInfo = await extractRedditVideo(url);
        
        console.log('\nVideo Info:');
        console.log('- Title:', videoInfo.title);
        console.log('- Author:', videoInfo.author);
        console.log('- Duration:', videoInfo.duration, 'seconds');
        console.log('- Platform:', videoInfo.platform);
        console.log('- URL:', videoInfo.url);
        console.log('- Thumbnail:', videoInfo.thumbnail ? 'Yes' : 'No');
        
        console.log('\nAvailable Formats:');
        videoInfo.formats?.forEach(format => {
          console.log(`  - ${format.quality} (${format.format})`);
          console.log(`    URL: ${format.url}`);
          if (format.audioUrl) {
            console.log(`    Audio URL: ${format.audioUrl}`);
          }
          console.log(`    Format ID: ${format.formatId}`);
        });
        
      } catch (error) {
        console.error('Error extracting video:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Failed to import extractor:', error);
  }
}

// Run the test
testRedditExtractor();
