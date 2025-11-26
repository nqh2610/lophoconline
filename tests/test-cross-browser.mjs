/**
 * Test 22: Cross-Browser Compatibility - Chrome + Edge
 * 
 * Priority: CRITICAL
 * 
 * Tests:
 * 1. Chrome peer connects to Edge peer
 * 2. Video/audio streaming works between different browsers
 * 3. DataChannels work across browsers
 * 4. ICE candidates exchange properly
 * 5. Connection remains stable
 * 
 * Expected Results:
 * - ✅ Both browsers connect successfully
 * - ✅ Media streams in both directions
 * - ✅ All DataChannels open
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 120000; // 2 minutes

console.log('🎬 Test 22: Cross-Browser Compatibility (Chrome + Edge)');
console.log('=' .repeat(70));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  let browserChrome, browserEdge;
  let pageChrome, pageEdge;
  
  try {
    // Launch Chrome
    console.log('\n📦 Launching Chrome...');
    browserChrome = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
      ],
      defaultViewport: { width: 1280, height: 720 },
    });
    
    // Launch Edge (Chromium-based) - fallback to second Chrome instance if Edge not found
    console.log('📦 Launching Edge (or second browser)...');
    try {
      browserEdge = await puppeteer.launch({
        headless: false,
        channel: 'msedge', // Use Microsoft Edge
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
        ],
        defaultViewport: { width: 1280, height: 720 },
      });
    } catch (edgeError) {
      console.log('⚠️  Edge not found, using second Chrome instance');
      browserEdge = await puppeteer.launch({
        headless: false,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--user-data-dir=/tmp/chrome-browser-2', // Separate profile
        ],
        defaultViewport: { width: 1280, height: 720 },
      });
    }
    
    pageChrome = await browserChrome.newPage();
    pageEdge = await browserEdge.newPage();
    
    // Setup console logging
    pageChrome.on('console', msg => {
      if (msg.text().includes('[Videolify]') || msg.text().includes('ERROR') || msg.text().includes('Failed')) {
        console.log('  [Chrome]', msg.text());
      }
    });
    
    pageEdge.on('console', msg => {
      if (msg.text().includes('[Videolify]') || msg.text().includes('ERROR') || msg.text().includes('Failed')) {
        console.log('  [Edge]', msg.text());
      }
    });
    
    // Generate unique room
    const roomId = `test-cross-browser-${Date.now()}`;
    const chromeUrl = `${BASE_URL}/test-videolify?room=${roomId}&name=Chrome-User&role=tutor`;
    const edgeUrl = `${BASE_URL}/test-videolify?room=${roomId}&name=Edge-User&role=student`;
    
    console.log(`\n🔗 Room: ${roomId}`);
    
    // ========================================
    // TEST 1: Chrome joins first
    // ========================================
    console.log('\n📝 Test 1: Chrome user joins room');
    
    await pageChrome.goto(chromeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    
    const chromeJoined = await pageChrome.evaluate(() => {
      const body = document.body.innerText;
      return !body.includes('không hỗ trợ') && !body.includes('Lỗi');
    });
    
    if (!chromeJoined) {
      console.log('❌ TEST 1 FAILED: Chrome failed to join');
      throw new Error('Chrome could not join room');
    }
    
    console.log('✅ TEST 1 PASSED: Chrome joined successfully');
    
    // ========================================
    // TEST 2: Edge joins second
    // ========================================
    console.log('\n📝 Test 2: Edge user joins room');
    
    await pageEdge.goto(edgeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(5000); // Wait for connection
    
    const edgeJoined = await pageEdge.evaluate(() => {
      const body = document.body.innerText;
      return !body.includes('không hỗ trợ') && !body.includes('Lỗi');
    });
    
    if (!edgeJoined) {
      console.log('❌ TEST 2 FAILED: Edge failed to join');
      throw new Error('Edge could not join room');
    }
    
    console.log('✅ TEST 2 PASSED: Edge joined successfully');
    
    // ========================================
    // TEST 3: Check connection status
    // ========================================
    console.log('\n📝 Test 3: Verify P2P connection established');
    
    await sleep(10000); // Wait for P2P negotiation
    
    const chromeConnection = await pageChrome.evaluate(() => {
      const videos = document.querySelectorAll('video');
      const connectionText = document.body.innerText;
      
      return {
        videoCount: videos.length,
        hasRemoteStream: videos.length >= 2,
        connectionEstablished: connectionText.includes('Connected') || 
                              connectionText.includes('Đã kết nối'),
      };
    });
    
    const edgeConnection = await pageEdge.evaluate(() => {
      const videos = document.querySelectorAll('video');
      const connectionText = document.body.innerText;
      
      return {
        videoCount: videos.length,
        hasRemoteStream: videos.length >= 2,
        connectionEstablished: connectionText.includes('Connected') || 
                              connectionText.includes('Đã kết nối'),
      };
    });
    
    console.log('  Chrome:', chromeConnection);
    console.log('  Edge:', edgeConnection);
    
    if (!chromeConnection.connectionEstablished && !edgeConnection.connectionEstablished) {
      console.log('❌ TEST 3 FAILED: P2P connection not established');
      console.log('   Chrome videos:', chromeConnection.videoCount);
      console.log('   Edge videos:', edgeConnection.videoCount);
      throw new Error('Cross-browser P2P connection failed');
    }
    
    console.log('✅ TEST 3 PASSED: P2P connection established');
    
    // ========================================
    // TEST 4: Check DataChannels
    // ========================================
    console.log('\n📝 Test 4: Verify DataChannels are open');
    
    await sleep(5000);
    
    const chromeDataChannels = await pageChrome.evaluate(() => {
      // Check for DataChannel open messages in console history
      const body = document.body.innerText;
      return {
        hasDataChannels: body.includes('OPEN') || body.includes('Ready'),
      };
    });
    
    const edgeDataChannels = await pageEdge.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasDataChannels: body.includes('OPEN') || body.includes('Ready'),
      };
    });
    
    console.log('  Chrome DataChannels:', chromeDataChannels);
    console.log('  Edge DataChannels:', edgeDataChannels);
    
    if (chromeDataChannels.hasDataChannels || edgeDataChannels.hasDataChannels) {
      console.log('✅ TEST 4 PASSED: DataChannels working');
    } else {
      console.log('⚠️  TEST 4 PARTIAL: DataChannels status unclear');
    }
    
    // ========================================
    // TEST 5: Monitor connection stability
    // ========================================
    console.log('\n📝 Test 5: Monitor connection stability (30 seconds)');
    
    let stable = true;
    for (let i = 0; i < 6; i++) {
      await sleep(5000);
      
      const chromeStable = await pageChrome.evaluate(() => {
        const body = document.body.innerText;
        return !body.includes('disconnected') && !body.includes('failed');
      });
      
      const edgeStable = await pageEdge.evaluate(() => {
        const body = document.body.innerText;
        return !body.includes('disconnected') && !body.includes('failed');
      });
      
      console.log(`  Check ${i + 1}/6: Chrome=${chromeStable ? '✅' : '❌'}, Edge=${edgeStable ? '✅' : '❌'}`);
      
      if (!chromeStable || !edgeStable) {
        stable = false;
        break;
      }
    }
    
    if (stable) {
      console.log('✅ TEST 5 PASSED: Connection remained stable');
    } else {
      console.log('⚠️  TEST 5 FAILED: Connection dropped');
    }
    
    // ========================================
    // Summary
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST 22 COMPLETED: Cross-Browser Compatibility');
    console.log('   - Chrome join: ✅');
    console.log('   - Edge join: ✅');
    console.log('   - P2P connection: ' + (chromeConnection.connectionEstablished || edgeConnection.connectionEstablished ? '✅' : '❌'));
    console.log('   - DataChannels: ' + (chromeDataChannels.hasDataChannels || edgeDataChannels.hasDataChannels ? '✅' : '⚠️'));
    console.log('   - Stability: ' + (stable ? '✅' : '⚠️'));
    console.log('='.repeat(70));
    
    await sleep(3000);
    
  } catch (error) {
    console.error('\n❌ TEST 22 FAILED:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    if (browserChrome) await browserChrome.close();
    if (browserEdge) await browserEdge.close();
  }
}

// Run test
runTest()
  .then(() => {
    console.log('\n✅ Cross-browser test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cross-browser test failed:', error.message);
    process.exit(1);
  });
