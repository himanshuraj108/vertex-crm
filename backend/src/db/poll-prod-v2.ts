import axios from 'axios';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const url = 'https://vertexcrmbackend.onrender.com/health';
  const targetCommit = '532bdc4-v2';

  console.log(`Polling ${url} until commit matches "${targetCommit}"...`);
  
  for (let attempt = 1; attempt <= 20; attempt++) {
    console.log(`\nAttempt ${attempt}/20...`);
    try {
      const res = await axios.get(url, { timeout: 10000 });
      console.log('Status:', res.status);
      console.log('Response body:', res.data);
      
      if (res.data && res.data.commit === targetCommit) {
        console.log('\n🎉 SUCCESS! Production server has successfully deployed and is running the new version!');
        return;
      }
    } catch (err: any) {
      console.log('Error fetching health status:', err.message);
    }
    
    // Wait 15 seconds before the next poll
    await wait(15000);
  }
  
  console.log('\nTimed out waiting for production deploy.');
}

main().catch(console.error);
