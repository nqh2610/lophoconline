/**
 * Test Room Full Logic (3rd person blocked)
 * Kiểm tra lớp 1-1 chỉ cho phép tối đa 2 người
 * 
 * Run: node test-room-full.mjs
 */

import puppeteer from 'puppeteer';

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  testRoomId: 'room-full-test-' + Date.now(),
  headless: false,
  slowMo: 50,
  timeout: 60000,
};

async function waitFor(condition, timeout = 10000, interval = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}

async function waitForConnection(page, peerId) {
  console.log(`[${peerId}] Waiting for P2P connection...`);
  
  const connected = await waitFor(async () => {
    return await page.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                         document.querySelector('video:not([data-testid="local-video"])');
      return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
    });
  }, 30000);
  
  if (!connected) {
    throw new Error(`[${peerId}] Connection timeout`);
  }
  
  console.log(`✅ [${peerId}] Connected`);
  return true;
}

async function joinRoom(page, peerId, role, name) {
  const url = `${CONFIG.baseUrl}/test-videolify?room=${CONFIG.testRoomId}&name=${encodeURIComponent(name)}&role=${role}`;
  console.log(`[${peerId}] Joining: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
  await page.waitForSelector('body', { timeout: 5000 });
  console.log(`[${peerId}] Page loaded`);
}

async function checkForRoomFullError(page, peerId) {
  console.log(`[${peerId}] Checking for ROOM_FULL error...`);
  
  // Wait a bit for error to appear
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check for toast notification
  const hasErrorToast = await page.evaluate(() => {
    const toasts = Array.from(document.querySelectorAll('[role="alert"], [data-toast], .toast'));
    return toasts.some(toast => {
      const text = toast.textContent || '';
      return text.includes('đầy') || text.includes('đủ người') || text.includes('không có quyền');
    });
  });
  
  // Check for error state in UI
  const hasErrorState = await page.evaluate(() => {
    const errorElements = Array.from(document.querySelectorAll('*'));
    return errorElements.some(el => {
      const text = el.textContent || '';
      return text.includes('Phòng học đã đầy') || 
             text.includes('đã đủ người') ||
             text.includes('không có quyền vào lớp');
    });
  });
  
  console.log(`[${peerId}] Error detection: toast=${hasErrorToast}, state=${hasErrorState}`);
  
  return hasErrorToast || hasErrorState;
}

async function runTest() {
  const startTime = Date.now();
  console.log('🚀 TEST: Room Full Logic (Max 2 peers for 1-1 class)\n');
  console.log(`📝 Room: ${CONFIG.testRoomId}\n`);
  
  let browserA, browserB, browserC;
  let pageA, pageB, pageC;
  
  try {
    // ========================================
    // Step 1: Launch browsers
    // ========================================
    console.log('🌐 Step 1: Launching 3 browsers...\n');
    
    browserA = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
      ],
    });
    
    browserB = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
      ],
    });
    
    browserC = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
      ],
    });
    
    pageA = await browserA.newPage();
    pageB = await browserB.newPage();
    pageC = await browserC.newPage();
    
    await pageA.setViewport({ width: 1280, height: 720 });
    await pageB.setViewport({ width: 1280, height: 720 });
    await pageC.setViewport({ width: 1280, height: 720 });
    
    // Console logging
    pageA.on('console', msg => console.log(`[A] ${msg.text()}`));
    pageB.on('console', msg => console.log(`[B] ${msg.text()}`));
    pageC.on('console', msg => console.log(`[C] ${msg.text()}`));
    
    // Enable test mode
    await pageA.evaluateOnNewDocument(() => { window.__VIDEOLIFY_TEST_MODE__ = true; });
    await pageB.evaluateOnNewDocument(() => { window.__VIDEOLIFY_TEST_MODE__ = true; });
    await pageC.evaluateOnNewDocument(() => { window.__VIDEOLIFY_TEST_MODE__ = true; });
    
    console.log('✅ All browsers launched\n');
    
    // ========================================
    // Step 2: Join peer A (Tutor)
    // ========================================
    console.log('👤 Step 2: Peer A (Tutor) joins room...\n');
    await joinRoom(pageA, 'A', 'tutor', 'Giáo viên A');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Peer A joined successfully\n');
    
    // ========================================
    // Step 3: Join peer B (Student)
    // ========================================
    console.log('👤 Step 3: Peer B (Student) joins room...\n');
    await joinRoom(pageB, 'B', 'student', 'Học sinh B');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Wait for connection
    await waitForConnection(pageA, 'A');
    await waitForConnection(pageB, 'B');
    
    console.log('✅ Peer A-B connected (Room now has 2/2 peers)\n');
    
    // ========================================
    // Step 4: Try to join peer C (Should be blocked)
    // ========================================
    console.log('🚫 Step 4: Peer C tries to join (should be BLOCKED)...\n');
    await joinRoom(pageC, 'C', 'student', 'Học sinh C');
    
    // Wait for error to appear
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if C got blocked
    const cBlocked = await checkForRoomFullError(pageC, 'C');
    
    // Check if C is NOT connected
    const cConnected = await pageC.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                         document.querySelector('video:not([data-testid="local-video"])');
      return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
    });
    
    console.log(`\n📊 Test Results:`);
    console.log(`   Peer C blocked with error: ${cBlocked ? '✅ YES' : '❌ NO'}`);
    console.log(`   Peer C NOT connected: ${!cConnected ? '✅ YES' : '❌ NO'}`);
    
    // ========================================
    // Step 5: Verify A-B still connected
    // ========================================
    console.log('\n🔍 Step 5: Verify A-B still connected...\n');
    
    const aStillConnected = await pageA.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                         document.querySelector('video:not([data-testid="local-video"])');
      return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
    });
    
    const bStillConnected = await pageB.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                         document.querySelector('video:not([data-testid="local-video"])');
      return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
    });
    
    console.log(`   Peer A still connected: ${aStillConnected ? '✅ YES' : '❌ NO'}`);
    console.log(`   Peer B still connected: ${bStillConnected ? '✅ YES' : '❌ NO'}`);
    
    // ========================================
    // Final Result
    // ========================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const testPassed = cBlocked && !cConnected && aStillConnected && bStillConnected;
    
    console.log('\n' + '='.repeat(60));
    if (testPassed) {
      console.log('✅ TEST PASSED: Room Full Logic Working Correctly');
      console.log('   - Room limited to 2 peers');
      console.log('   - 3rd peer blocked with error message');
      console.log('   - Existing peers unaffected');
    } else {
      console.log('❌ TEST FAILED: Room Full Logic NOT Working');
      if (!cBlocked) console.log('   - 3rd peer did NOT receive error');
      if (cConnected) console.log('   - 3rd peer was NOT blocked');
      if (!aStillConnected || !bStillConnected) console.log('   - Existing peers affected');
    }
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(60));
    
    process.exit(testPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (pageA) await pageA.close().catch(() => {});
    if (pageB) await pageB.close().catch(() => {});
    if (pageC) await pageC.close().catch(() => {});
    if (browserA) await browserA.close().catch(() => {});
    if (browserB) await browserB.close().catch(() => {});
    if (browserC) await browserC.close().catch(() => {});
  }
}

// Run test
runTest();
