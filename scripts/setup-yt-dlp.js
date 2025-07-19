const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkYtDlp() {
  try {
    // First try the direct command
    await execAsync('yt-dlp --version');
    console.log('✅ yt-dlp is already installed (direct command)');
    return true;
  } catch (error) {
    // Try as Python module
    try {
      await execAsync('python -m yt_dlp --version');
      console.log('✅ yt-dlp is already installed (Python module)');
      return true;
    } catch (moduleError) {
      console.log('❌ yt-dlp is not installed');
      return false;
    }
  }
}

async function installYtDlp() {
  console.log('📦 Installing yt-dlp...');
  
  try {
    // Try to install using pip (Python)
    try {
      await execAsync('pip install -U yt-dlp');
      console.log('✅ yt-dlp installed successfully using pip');
      return true;
    } catch (pipError) {
      console.log('⚠️  pip installation failed, trying alternative methods...');
    }

    // For Windows, try downloading the executable
    if (process.platform === 'win32') {
      console.log('📥 Downloading yt-dlp.exe for Windows...');
      const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
      
      // Create a simple PowerShell command to download
      const psCommand = `Invoke-WebRequest -Uri "${downloadUrl}" -OutFile "$env:USERPROFILE\\yt-dlp.exe"`;
      await execAsync(`powershell -Command "${psCommand}"`);
      
      console.log('✅ yt-dlp.exe downloaded. Please add it to your PATH or move it to a directory in your PATH.');
      console.log('📁 Downloaded to: %USERPROFILE%\\yt-dlp.exe');
      return true;
    }

    // For macOS, try using homebrew
    if (process.platform === 'darwin') {
      try {
        await execAsync('brew install yt-dlp');
        console.log('✅ yt-dlp installed successfully using Homebrew');
        return true;
      } catch (brewError) {
        console.log('⚠️  Homebrew installation failed');
      }
    }

    // For Linux, try using the direct download
    if (process.platform === 'linux') {
      console.log('📥 Downloading yt-dlp for Linux...');
      await execAsync('sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp');
      await execAsync('sudo chmod a+rx /usr/local/bin/yt-dlp');
      console.log('✅ yt-dlp installed successfully');
      return true;
    }

  } catch (error) {
    console.error('❌ Failed to install yt-dlp:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking yt-dlp installation...\n');
  
  const isInstalled = await checkYtDlp();
  
  if (!isInstalled) {
    console.log('\n📌 yt-dlp is required for video downloads.');
    console.log('🔧 Attempting automatic installation...\n');
    
    const installSuccess = await installYtDlp();
    
    if (!installSuccess) {
      console.log('\n⚠️  Automatic installation failed.');
      console.log('\n📚 Please install yt-dlp manually:');
      console.log('   - Using pip: pip install yt-dlp');
      console.log('   - On macOS: brew install yt-dlp');
      console.log('   - On Windows: Download from https://github.com/yt-dlp/yt-dlp/releases');
      console.log('   - On Linux: sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp');
      process.exit(1);
    }
  }
  
  console.log('\n✨ Setup complete! Your video downloader is ready to use.');
}

main().catch(console.error);
