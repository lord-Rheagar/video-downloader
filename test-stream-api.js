const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testStreamAPI() {
  const testUrl = 'https://www.reddit.com/r/funny/comments/1m3qnm2/caught_during_a_savannah_bananas_baseball_game/';
  
  console.log('Testing stream API with Reddit URL:', testUrl);
  
  try {
    const response = await fetch('http://localhost:3001/api/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url: testUrl,
        quality: '720p'
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('Error response:', JSON.stringify(errorData, null, 2));
    } else {
      console.log('Success! Stream endpoint working.');
    }
    
  } catch (error) {
    console.error('Failed to call API:', error.message);
  }
}

testStreamAPI();
