const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkFfmpeg() {
  try {
    await execAsync('ffmpeg -version');
    console.log('✅ ffmpeg is already installed');
    return true;
  } catch (error) {
    console.log('❌ ffmpeg is not installed');
    return false;
  }
}

async function installFfmpeg() {
  console.log('📦 Installing ffmpeg...');
  
  try {
    if (process.platform === 'win32') {
      console.log('\n📌 FFmpeg is required for video merging.');
      console.log('\n📥 Please download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/');
      console.log('\n📚 Installation steps:');
      console.log('1. Download the "release essentials" build');
      console.log('2. Extract the ZIP file to C:\\ffmpeg');
      console.log('3. Add C:\\ffmpeg\\bin to your PATH environment variable');
      console.log('4. Restart your terminal and run this script again');
      
      // Alternative: Install via pip
      console.log('\n🔧 Alternative: Install via pip');
      console.log('   pip install ffmpeg-python');
      
      return false;
    }

    // For macOS, try using homebrew
    if (process.platform === 'darwin') {
      try {
        await execAsync('brew install ffmpeg');
        console.log('✅ ffmpeg installed successfully using Homebrew');
        return true;
      } catch (brewError) {
        console.log('⚠️  Homebrew installation failed');
      }
    }

    // For Linux
    if (process.platform === 'linux') {
      console.log('📥 Installing ffmpeg for Linux...');
      try {
        await execAsync('sudo apt-get update && sudo apt-get install -y ffmpeg');
        console.log('✅ ffmpeg installed successfully');
        return true;
      } catch (aptError) {
        // Try yum for RedHat-based systems
        try {
          await execAsync('sudo yum install -y ffmpeg');
          console.log('✅ ffmpeg installed successfully');
          return true;
        } catch (yumError) {
          console.log('⚠️  Package manager installation failed');
        }
      }
    }

  } catch (error) {
    console.error('❌ Failed to install ffmpeg:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking ffmpeg installation...\n');
  
  const isInstalled = await checkFfmpeg();
  
  if (!isInstalled) {
    console.log('\n📌 ffmpeg is required for video processing.');
    
    const installSuccess = await installFfmpeg();
    
    if (!installSuccess) {
      console.log('\n⚠️  Please install ffmpeg manually to enable all video qualities.');
      console.log('\n📝 Note: 720p and 360p videos will still work without ffmpeg.');
    }
  } else {
    console.log('\n✨ ffmpeg is ready! All video qualities will work properly.');
  }
}

main().catch(console.error);
