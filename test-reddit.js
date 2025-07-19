const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testRedditExtraction() {
  const url = 'https://www.reddit.com/r/videos/comments/1g6s5ay/insanely_creative_beatboxing_by_sxin/';
  
  try {
    console.log('Testing Reddit extraction...');
    const command = `python -m yt_dlp -j --no-warnings --no-check-certificate "${url}"`;
    const { stdout } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024
    });
    
    const videoInfo = JSON.parse(stdout);
    
    console.log('\nTitle:', videoInfo.title);
    console.log('Duration:', videoInfo.duration);
    console.log('Uploader:', videoInfo.uploader);
    console.log('Available formats:');
    
    // Filter and show MP4 formats
    const mp4Formats = videoInfo.formats
      .filter(f => f.ext === 'mp4' && f.height)
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    
    mp4Formats.forEach(format => {
      console.log(`  - ${format.height}p (${format.format_id}): ${format.format_note || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRedditExtraction();
