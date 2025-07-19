const { exec } = require('child_process');

console.log('Testing yt-dlp functionality...\n');

// Test 1: Check version
exec('python -m yt_dlp --version', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ yt-dlp not working:', error.message);
    return;
  }
  console.log('✅ yt-dlp version:', stdout.trim());
});

// Test 2: Try to get video info with minimal options
const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo" - first YouTube video
console.log('\nTesting video info extraction...');
console.log('Test URL:', testUrl);

const command = `python -m yt_dlp --print title --quiet --no-warnings "${testUrl}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('\n❌ Failed to extract video info');
    console.error('Error:', error.message);
    if (stderr) console.error('stderr:', stderr);
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Wait a few minutes if you see 403 errors');
    console.log('2. Try using a VPN');
    console.log('3. Clear browser cookies and cache');
    console.log('4. Use a different video URL');
    return;
  }
  
  console.log('\n✅ Successfully extracted video title:', stdout.trim());
  console.log('\n✨ yt-dlp is working correctly!');
});
