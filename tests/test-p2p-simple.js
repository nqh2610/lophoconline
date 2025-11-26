/**
 * Simple P2P Connectivity Test
 * Basic test to verify P2P connection works
 */

const puppeteer = require('playwright');

async function testP2PConnectivity() {
  console.log('🎯 Starting Simple P2P Connectivity Test...');

  let browser1, browser2;
  let page1, page2;

  try {
    // Launch browsers
    console.log('🚀 Launching browsers...');
    browser1 = await puppeteer.chromium.launch({ headless: true });
    browser2 = await puppeteer.chromium.launch({ headless: true });

    // Create pages
    page1 = await browser1.newPage();
    page2 = await browser2.newPage();

    console.log('✅ Browsers launched successfully');

    // Navigate to app
    const roomId = `test-p2p-${Date.now()}`;
    console.log(`🏠 Testing room: ${roomId}`);

    await page1.goto(`http://localhost:3000/videolify?roomId=${roomId}&userName=Peer1&role=tutor`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page2.goto(`http://localhost:3000/videolify?roomId=${roomId}&userName=Peer2&role=student`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ Both peers navigated to room');

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check connection status
    const status1 = await page1.evaluate(() => {
      const greenIndicators = document.querySelectorAll('[style*="background-color: rgb(34, 197, 94)"]');
      return greenIndicators.length > 0;
    });

    const status2 = await page2.evaluate(() => {
      const greenIndicators = document.querySelectorAll('[style*="background-color: rgb(34, 197, 94)"]');
      return greenIndicators.length > 0;
    });

    console.log(`📊 Peer 1 connected: ${status1}`);
    console.log(`📊 Peer 2 connected: ${status2}`);

    if (status1 && status2) {
      console.log('✅ P2P Connectivity Test PASSED');
      return true;
    } else {
      console.log('❌ P2P Connectivity Test FAILED');
      return false;
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return false;
  } finally {
    // Cleanup
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
  }
}

// Run test
testP2PConnectivity()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });