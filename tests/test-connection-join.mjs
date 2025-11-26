/**
 * AUTO TEST: Connection Issues - Join mới không kết nối
 * 
 * Test: 2 peers join → Check connection established
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const TEST_ROOM = `test-join-${Date.now()}`;

let browser1, browser2;
let page1, page2;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupBrowser(name) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  const page = await browser.newPage();
  
  // Collect all console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${name}] ${text}`);
    
    // Print important logs immediately
    if (text.includes('Videolify') || 
        text.includes('SSE') || 
        text.includes('Peer') ||
        text.includes('connectionState') ||
        text.includes('shouldInitiate') ||
        text.includes('Creating offer') ||
        text.includes('Received offer')) {
      console.log(`[${name}] ${text}`);
    }
  });
  
  // Setup permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE_URL, ['camera', 'microphone']);
  
  return { browser, page, logs };
}

async function login(page, email, password, name) {
  console.log(`\n[${name}] 🔐 Logging in (skipped - direct video call access)...`);
  // Skip login for testing - go directly to video call
  console.log(`[${name}] ✅ Ready`);
}

async function joinVideoCall(page, roomId, name) {
  console.log(`\n[${name}] 🚪 Joining room: ${roomId}`);
  
  const url = `${BASE_URL}/video-call/${roomId}`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Wait for video elements to appear
  await delay(2000);
  
  console.log(`[${name}] ✅ Page loaded`);
}

async function checkConnectionState(page, name, timeout = 15000) {
  console.log(`\n[${name}] 🔍 Checking connection state...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      if (!pc) return { hasConnection: false };
      
      return {
        hasConnection: true,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
      };
    });
    
    console.log(`[${name}] Connection state:`, state);
    
    if (state.hasConnection && state.connectionState === 'connected') {
      console.log(`[${name}] ✅ CONNECTED!`);
      return true;
    }
    
    if (state.hasConnection && (state.connectionState === 'failed' || state.iceConnectionState === 'failed')) {
      console.log(`[${name}] ❌ CONNECTION FAILED!`);
      return false;
    }
    
    await delay(1000);
  }
  
  console.log(`[${name}] ⏱️ TIMEOUT - Not connected after ${timeout/1000}s`);
  return false;
}

async function getDebugInfo(page, name) {
  const info = await page.evaluate(() => {
    return {
      peerConnection: {
        exists: !!window.__VIDEOLIFY_DEBUG__?.peerConnection,
        connectionState: window.__VIDEOLIFY_DEBUG__?.peerConnection?.connectionState,
        iceConnectionState: window.__VIDEOLIFY_DEBUG__?.peerConnection?.iceConnectionState,
        signalingState: window.__VIDEOLIFY_DEBUG__?.peerConnection?.signalingState,
      },
      sse: {
        exists: !!window.eventSource,
        readyState: window.eventSource?.readyState, // 0=CONNECTING, 1=OPEN, 2=CLOSED
        url: window.eventSource?.url,
      },
      refs: {
        localPeerId: window.peerIdRef?.current,
        remotePeerId: window.remotePeerIdRef?.current,
        hasJoined: window.hasJoinedRef?.current,
      }
    };
  });
  
  console.log(`\n[${name}] 📊 DEBUG INFO:`, JSON.stringify(info, null, 2));
  return info;
}

async function testJoinNew() {
  console.log('\n\n🧪 ========== TEST: Join mới (2 peers) ==========\n');
  
  try {
    // Setup browsers
    console.log('Setting up browsers...');
    ({ browser: browser1, page: page1 } = await setupBrowser('Peer A'));
    ({ browser: browser2, page: page2 } = await setupBrowser('Peer B'));
    
    // Login (skip for direct access)
    await login(page1, '', '', 'Peer A');
    await login(page2, '', '', 'Peer B');
    
    // Peer A join first
    console.log('\n📍 STEP 1: Peer A joins room');
    await joinVideoCall(page1, TEST_ROOM, 'Peer A');
    await delay(3000); // Wait for SSE + joinRoom
    
    await getDebugInfo(page1, 'Peer A');
    
    // Peer B join second
    console.log('\n📍 STEP 2: Peer B joins room');
    await joinVideoCall(page2, TEST_ROOM, 'Peer B');
    await delay(3000); // Wait for SSE + joinRoom
    
    await getDebugInfo(page2, 'Peer B');
    
    // Check connection on both sides
    console.log('\n📍 STEP 3: Checking connections...');
    
    const [connectedA, connectedB] = await Promise.all([
      checkConnectionState(page1, 'Peer A', 20000),
      checkConnectionState(page2, 'Peer B', 20000)
    ]);
    
    // Final debug info
    console.log('\n📍 STEP 4: Final state');
    await getDebugInfo(page1, 'Peer A');
    await getDebugInfo(page2, 'Peer B');
    
    // Result
    console.log('\n\n📊 ========== TEST RESULT ==========\n');
    
    if (connectedA && connectedB) {
      console.log('✅ TEST PASSED: Both peers connected successfully!');
      return true;
    } else {
      console.log('❌ TEST FAILED: Connection not established');
      console.log('  Peer A connected:', connectedA);
      console.log('  Peer B connected:', connectedB);
      
      // Print relevant logs for debugging
      console.log('\n📝 Checking for key events in console logs...');
      
      // Check if SSE connected
      console.log('\nSearching for SSE events...');
      // Check if peer-joined received
      console.log('Searching for peer-joined events...');
      // Check if offers/answers sent
      console.log('Searching for offer/answer events...');
      
      return false;
    }
    
  } catch (err) {
    console.error('\n❌ Test execution error:', err);
    return false;
  } finally {
    // Keep browsers open for inspection
    console.log('\n⏸️  Browsers will stay open for 30s for inspection...');
    await delay(30000);
    
    console.log('🧹 Cleaning up...');
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
  }
}

// Run test
console.log('🚀 Starting Connection Test...\n');
console.log('Testing room:', TEST_ROOM);
console.log('Server:', BASE_URL);
console.log('\n');

testJoinNew()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
