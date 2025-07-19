const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testStreamDirect() {
  const testUrl = 'https://www.reddit.com/r/funny/comments/1m3qnm2/caught_during_a_savannah_bananas_baseball_game/';
  
  console.log('Testing stream API directly...');
  console.log('URL:', testUrl);
  
  const requestBody = {
    url: testUrl,
    quality: '720p'
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch('http://localhost:3001/api/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const text = await response.text();
      console.log('\nError response body:', text);
      
      try {
        const errorData = JSON.parse(text);
        console.log('\nParsed error:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        // Not JSON
      }
    } else {
      console.log('\nSuccess! Stream is working.');
      
      // Don't actually download, just check headers
      const contentType = response.headers.get('content-type');
      const contentDisposition = response.headers.get('content-disposition');
      
      console.log('Content-Type:', contentType);
      console.log('Content-Disposition:', contentDisposition);
    }
    
  } catch (error) {
    console.error('\nFailed to call API:', error);
  }
}

// Wait a moment for server to be ready
setTimeout(testStreamDirect, 2000);
