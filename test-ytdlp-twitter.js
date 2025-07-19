const { exec } = require('child_process');

// Test URL - replace with an actual Twitter video URL
const testUrl = process.argv[2] || 'https://twitter.com/i/status/1234567890';

console.log('Testing yt-dlp with Twitter URL:', testUrl);

const command = `python -m yt_dlp --version`;

// First check if yt-dlp is working
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('yt-dlp not found:', error);
    return;
  }
  
  console.log('yt-dlp version:', stdout.trim());
  
  // Now test with Twitter
  const twitterCommand = `python -m yt_dlp -j --no-warnings "${testUrl}"`;
  
  console.log('\nTesting Twitter extraction...');
  
  exec(twitterCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      console.error('\nError:', error.message);
      if (stderr) {
        console.error('Stderr:', stderr);
      }
      return;
    }
    
    if (stderr) {
      console.error('Warnings:', stderr);
    }
    
    try {
      const info = JSON.parse(stdout);
      console.log('\nSuccess! Video info:');
      console.log('Title:', info.title || 'N/A');
      console.log('Duration:', info.duration || 'N/A');
      console.log('Uploader:', info.uploader || 'N/A');
      console.log('Formats available:', info.formats ? info.formats.length : 0);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      console.log('Raw output:', stdout);
    }
  });
});
