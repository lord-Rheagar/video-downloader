const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testReddit() {
  // Test URL - make sure to use a recent Reddit video post
  const testUrl = 'https://www.reddit.com/r/aww/comments/1g6o5b5/this_little_guy_enjoying_the_rain/';
  
  console.log('Testing Reddit URL:', testUrl);
  console.log('Checking if yt-dlp can extract info...\n');
  
  try {
    const { stdout, stderr } = await execAsync(
      `python -m yt_dlp -j --no-warnings "${testUrl}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    const info = JSON.parse(stdout);
    console.log('✓ Success! Video info extracted');
    console.log('Title:', info.title);
    console.log('Duration:', info.duration || 'N/A');
    console.log('Uploader:', info.uploader || info.channel || 'N/A');
    
    // Check formats
    const videoFormats = info.formats?.filter(f => f.vcodec && f.vcodec !== 'none') || [];
    console.log('\nVideo formats found:', videoFormats.length);
    
    // Show available qualities
    const mp4Formats = videoFormats.filter(f => f.ext === 'mp4' && f.height);
    if (mp4Formats.length > 0) {
      console.log('\nAvailable MP4 qualities:');
      mp4Formats
        .sort((a, b) => (b.height || 0) - (a.height || 0))
        .forEach(f => {
          console.log(`  - ${f.height}p (format ${f.format_id})`);
        });
    }
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.message.includes('ERROR:')) {
      console.log('\nNote: This Reddit post might not contain a video, or the URL might be incorrect.');
    }
  }
}

testReddit();
