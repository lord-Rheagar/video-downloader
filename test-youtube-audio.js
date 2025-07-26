const { spawn } = require('child_process');
const fs = require('fs');

async function testYouTubeDownload() {
  const url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // Me at the zoo - first YouTube video
  
  console.log('Testing YouTube download with audio merging...\n');
  
  // Test 1: Check if ffmpeg is accessible to yt-dlp
  console.log('1. Checking ffmpeg availability:');
  const checkFfmpeg = spawn('python', ['-m', 'yt_dlp', '--version'], {
    windowsHide: true
  });
  
  checkFfmpeg.stdout.on('data', (data) => {
    console.log(`yt-dlp version: ${data.toString().trim()}`);
  });
  
  await new Promise(resolve => checkFfmpeg.on('close', resolve));
  
  // Test 2: List available formats
  console.log('\n2. Listing available formats:');
  const listFormats = spawn('python', [
    '-m', 'yt_dlp',
    '-F',  // List formats
    url
  ], {
    windowsHide: true
  });
  
  listFormats.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  
  listFormats.stderr.on('data', (data) => {
    console.error(`Error: ${data.toString()}`);
  });
  
  await new Promise(resolve => listFormats.on('close', resolve));
  
  // Test 3: Download with audio merging
  console.log('\n3. Testing download with audio merging (720p):');
  const downloadArgs = [
    '-m', 'yt_dlp',
    '--no-warnings',
    '-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', 'ffmpeg',
    '-o', 'test_video_720p.mp4',
    '--verbose',  // Add verbose output to see what's happening
    url
  ];
  
  console.log('Running command: python', downloadArgs.join(' '));
  
  const download = spawn('python', downloadArgs, {
    windowsHide: true
  });
  
  download.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  
  download.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('[download]')) {  // Filter out download progress
      console.log('yt-dlp output:', output);
    }
  });
  
  download.on('close', (code) => {
    console.log(`\nDownload process exited with code ${code}`);
    
    if (code === 0) {
      // Check if file was created
      if (fs.existsSync('test_video_720p.mp4')) {
        const stats = fs.statSync('test_video_720p.mp4');
        console.log(`\nSuccess! File created: test_video_720p.mp4 (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Test with ffprobe to check if audio is present
        console.log('\n4. Checking if audio stream is present:');
        const checkAudio = spawn('ffprobe', [
          '-v', 'error',
          '-show_streams',
          '-select_streams', 'a',
          '-show_entries', 'stream=codec_name,codec_type',
          '-of', 'default=noprint_wrappers=1',
          'test_video_720p.mp4'
        ]);
        
        checkAudio.stdout.on('data', (data) => {
          console.log('Audio stream info:', data.toString());
        });
        
        checkAudio.stderr.on('data', (data) => {
          console.error('FFprobe error:', data.toString());
        });
      } else {
        console.log('\nError: Output file was not created');
      }
    }
  });
}

// Run the test
testYouTubeDownload().catch(console.error);
