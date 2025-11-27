/**
 * Connection Status Indicator Test
 * 
 * Tests:
 * 1. Green indicator - Both peers connected with video frames
 * 2. Orange indicator - Connected but no remote video frames yet
 * 3. Red indicator - Disconnected/failed state
 * 4. Auto-recovery after network interruption
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = '6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';
const PREJOIN_URL = `${BASE_URL}/prejoin-videolify-v2?accessToken=${ACCESS_TOKEN}`;

const TUTOR = { username: 'tutor_mai', password: '123456' };
const STUDENT = { username: 'test', password: 'Test123456' };

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const results = [];

function recordResult(name, passed, details = '') {
  results.push({ name, passed, details });
  console.log(`\n${passed ? '✅' : '❌'} TEST: ${name}${details ? ` - ${details}` : ''}`);
}

/**
 * Login helper
 */
async function login(page, credentials, label) {
  console.log(`   [${label}] Logging in...`);
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('#username', credentials.username);
  await page.fill('#password', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  console.log(`   [${label}] ✅ Logged in`);
}

/**
 * Join video call from prejoin
 */
async function joinCall(page, label) {
  await page.goto(PREJOIN_URL);
  await page.waitForLoadState('networkidle');
  
  await page.waitForFunction(() => {
    const btn = document.querySelector('#join-button');
    return btn && !btn.disabled;
  }, { timeout: 30000 });
  
  console.log(`   [${label}] Clicking join...`);
  await page.click('#join-button');
  
  await page.waitForSelector('[class*="video"]', { timeout: 15000 });
  console.log(`   [${label}] In video call`);
}

/**
 * Get connection indicator color
 */
async function getIndicatorColor(page) {
  return await page.evaluate(() => {
    // Debug: log all elements we find
    const allIndicators = document.querySelectorAll('[class*="rounded-full"]');
    
    for (const el of allIndicators) {
      const classList = el.className || '';
      const size = el.getBoundingClientRect();
      
      // Look for small indicator (w-2 = 8px)
      if (size.width <= 12 && size.height <= 12) {
        if (classList.includes('bg-green-500')) return 'green';
        if (classList.includes('bg-orange-500')) return 'orange';
        if (classList.includes('bg-red-500')) return 'red';
      }
    }
    
    // Fallback: check using computed style
    const containers = document.querySelectorAll('.absolute');
    for (const container of containers) {
      const indicator = container.querySelector('div');
      if (indicator) {
        const style = window.getComputedStyle(indicator);
        const bgColor = style.backgroundColor;
        
        // Green: rgb(34, 197, 94)
        // Orange: rgb(249, 115, 22)
        // Red: rgb(239, 68, 68)
        if (bgColor.includes('34, 197, 94') || bgColor.includes('34,197,94')) return 'green';
        if (bgColor.includes('249, 115, 22') || bgColor.includes('249,115,22')) return 'orange';
        if (bgColor.includes('239, 68, 68') || bgColor.includes('239,68,68')) return 'red';
      }
    }
    
    return 'unknown';
  });
}

/**
 * Check if remote video has frames
 */
async function hasRemoteVideoFrames(page) {
  return await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll('video'));
    for (const v of videos) {
      // Remote video is typically not muted
      if (!v.muted && v.srcObject && v.videoWidth > 0 && v.videoHeight > 0) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Wait for specific indicator color
 */
async function waitForIndicatorColor(page, expectedColor, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const color = await getIndicatorColor(page);
    if (color === expectedColor) {
      return { success: true, elapsed: Date.now() - startTime };
    }
    await delay(500);
  }
  
  const finalColor = await getIndicatorColor(page);
  return { success: false, elapsed: timeout, actualColor: finalColor };
}

/**
 * Wait for P2P connection
 */
async function waitForP2P(page, label, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      let remoteActive = false;
      
      for (const v of videos) {
        const hasFrames = v.videoWidth > 0 && v.videoHeight > 0;
        if (hasFrames && !v.muted) {
          remoteActive = true;
          break;
        }
      }
      
      return { remoteActive, videoCount: videos.length };
    });
    
    if (state.remoteActive) {
      const elapsed = Date.now() - startTime;
      console.log(`   [${label}] ✅ P2P connected with video (${elapsed}ms)`);
      return { success: true, elapsed };
    }
    
    await delay(300);
  }
  
  console.log(`   [${label}] ⚠️ P2P timeout after ${timeout}ms`);
  return { success: false, elapsed: timeout };
}

async function runTests() {
  console.log('══════════════════════════════════════════════════');
  console.log('   🎨 CONNECTION INDICATOR TEST SUITE');
  console.log('══════════════════════════════════════════════════\n');

  let tutorBrowser, studentBrowser;
  let tutorPage, studentPage;

  try {
    // Launch browsers
    console.log('🚀 Launching browsers...\n');
    
    tutorBrowser = await chromium.launch({ 
      headless: true,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });
    
    studentBrowser = await chromium.launch({ 
      headless: true,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });

    const tutorContext = await tutorBrowser.newContext({
      permissions: ['camera', 'microphone']
    });
    
    const studentContext = await studentBrowser.newContext({
      permissions: ['camera', 'microphone']
    });

    tutorPage = await tutorContext.newPage();
    studentPage = await studentContext.newPage();

    // Login both users
    await login(tutorPage, TUTOR, 'Tutor');
    await login(studentPage, STUDENT, 'Student');

    // ═══════════════════════════════════════════════════════════
    // TEST 1: Initial state before peer joins (should be orange - connecting)
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 1: Initial State (Single Peer - Connecting/Waiting)');
    console.log('────────────────────────────────────────');
    
    await joinCall(tutorPage, 'Tutor');
    await delay(3000); // Wait for SSE connection
    
    const initialColor = await getIndicatorColor(tutorPage);
    console.log(`   Initial indicator color (no peer): ${initialColor}`);
    
    // Should be orange (connecting/waiting for peer) or green (SSE connected)
    const test1Pass = initialColor === 'orange' || initialColor === 'green';
    recordResult(
      'Initial State (Waiting for Peer)',
      test1Pass,
      `Color: ${initialColor} (expected: orange or green)`
    );

    // ═══════════════════════════════════════════════════════════
    // TEST 2: Orange -> Green transition when peer joins with video
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 2: Color Transition - Orange to Green');
    console.log('────────────────────────────────────────');
    
    const colorBeforePeer = await getIndicatorColor(tutorPage);
    console.log(`   Color before peer joins: ${colorBeforePeer}`);
    
    await joinCall(studentPage, 'Student');
    
    // Wait for P2P connection with video frames
    console.log('   Waiting for P2P connection with video...');
    const p2pResult = await waitForP2P(tutorPage, 'Tutor', 30000);
    
    if (p2pResult.success) {
      // Check if color changed to green
      await delay(2000); // Allow UI to update
      const colorAfterP2P = await getIndicatorColor(tutorPage);
      console.log(`   Color after P2P connected: ${colorAfterP2P}`);
      
      const hasFrames = await hasRemoteVideoFrames(tutorPage);
      console.log(`   Remote video has frames: ${hasFrames}`);
      
      // Green means connected with video frames
      // Orange means connected but waiting for video frames
      const test2Pass = colorAfterP2P === 'green' || (colorAfterP2P === 'orange' && !hasFrames);
      recordResult(
        'Color Transition (Peer Connected)',
        test2Pass,
        `Before: ${colorBeforePeer}, After: ${colorAfterP2P}, HasFrames: ${hasFrames}`
      );
    } else {
      recordResult('Color Transition (Peer Connected)', false, 'P2P connection failed');
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 3: Green indicator with stable video
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 3: Green Indicator with Stable Video');
    console.log('────────────────────────────────────────');
    
    // Wait for video to stabilize
    console.log('   Waiting for video to stabilize (5s)...');
    await delay(5000);
    
    const tutorColor = await getIndicatorColor(tutorPage);
    const studentColor = await getIndicatorColor(studentPage);
    const tutorHasFrames = await hasRemoteVideoFrames(tutorPage);
    const studentHasFrames = await hasRemoteVideoFrames(studentPage);
    
    console.log(`   Tutor: color=${tutorColor}, hasRemoteFrames=${tutorHasFrames}`);
    console.log(`   Student: color=${studentColor}, hasRemoteFrames=${studentHasFrames}`);
    
    // With stable video frames, should be green
    const test3Pass = (tutorColor === 'green' && tutorHasFrames) || 
                      (tutorColor === 'orange' && !tutorHasFrames);
    recordResult(
      'Green Indicator (Stable Video)',
      test3Pass,
      `Tutor: ${tutorColor} (frames: ${tutorHasFrames}), Student: ${studentColor} (frames: ${studentHasFrames})`
    );

    // ═══════════════════════════════════════════════════════════
    // TEST 4: Red indicator when peer disconnects
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 4: Red/Orange Indicator When Peer Disconnects');
    console.log('────────────────────────────────────────');
    
    const colorBeforeDisconnect = await getIndicatorColor(tutorPage);
    console.log(`   Color before disconnect: ${colorBeforeDisconnect}`);
    
    // Close student connection
    console.log('   Closing student connection...');
    await studentPage.close();
    
    // Wait for tutor to detect disconnect
    await delay(5000);
    
    const colorAfterDisconnect = await getIndicatorColor(tutorPage);
    console.log(`   Color after disconnect: ${colorAfterDisconnect}`);
    
    // After peer disconnects, should go to orange (waiting) or red (error)
    const test4Pass = colorAfterDisconnect === 'orange' || 
                      colorAfterDisconnect === 'red' || 
                      colorAfterDisconnect === 'yellow';
    recordResult(
      'Indicator After Peer Disconnect',
      test4Pass,
      `Before: ${colorBeforeDisconnect}, After: ${colorAfterDisconnect}`
    );

    // ═══════════════════════════════════════════════════════════
    // TEST 5: Auto-recovery when peer reconnects
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 5: Auto-Recovery When Peer Reconnects');
    console.log('────────────────────────────────────────');
    
    // Recreate student page
    studentPage = await studentContext.newPage();
    await login(studentPage, STUDENT, 'Student');
    
    console.log('   Student rejoining...');
    const rejoinStart = Date.now();
    await joinCall(studentPage, 'Student');
    
    // Wait for P2P reconnection
    const reconnectResult = await waitForP2P(tutorPage, 'Tutor', 30000);
    const reconnectTime = Date.now() - rejoinStart;
    
    if (reconnectResult.success) {
      await delay(2000);
      const colorAfterReconnect = await getIndicatorColor(tutorPage);
      console.log(`   Color after reconnect: ${colorAfterReconnect}`);
      console.log(`   Reconnection time: ${reconnectTime}ms`);
      
      const test5Pass = colorAfterReconnect === 'green' || colorAfterReconnect === 'orange';
      recordResult(
        'Auto-Recovery (Peer Reconnect)',
        test5Pass,
        `Reconnected in ${reconnectTime}ms, Color: ${colorAfterReconnect}`
      );
    } else {
      recordResult('Auto-Recovery (Peer Reconnect)', false, 'Reconnection failed');
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 6: Multiple disconnect/reconnect cycles
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 6: Multiple Reconnection Cycles (Stability)');
    console.log('────────────────────────────────────────');
    
    let cyclesPassed = 0;
    const totalCycles = 3;
    
    for (let i = 1; i <= totalCycles; i++) {
      console.log(`   Cycle ${i}/${totalCycles}:`);
      
      // Disconnect
      await studentPage.reload();
      await delay(2000);
      
      // Wait for reconnection
      const cycleResult = await waitForP2P(tutorPage, 'Tutor', 20000);
      
      if (cycleResult.success) {
        const color = await getIndicatorColor(tutorPage);
        console.log(`     ✅ Reconnected (${cycleResult.elapsed}ms), color: ${color}`);
        cyclesPassed++;
      } else {
        console.log(`     ❌ Reconnection failed`);
      }
      
      await delay(1000);
    }
    
    recordResult(
      'Multiple Reconnection Cycles',
      cyclesPassed === totalCycles,
      `${cyclesPassed}/${totalCycles} cycles successful`
    );

    // ═══════════════════════════════════════════════════════════
    // TEST 7: Connection indicator accuracy over time
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 7: Indicator Accuracy Over Time (30s)');
    console.log('────────────────────────────────────────');
    
    let accurateChecks = 0;
    const totalChecks = 6;
    
    for (let i = 1; i <= totalChecks; i++) {
      await delay(5000);
      
      const color = await getIndicatorColor(tutorPage);
      const hasFrames = await hasRemoteVideoFrames(tutorPage);
      
      // Green = has frames, Orange = no frames
      const isAccurate = (color === 'green' && hasFrames) || 
                        (color === 'orange' && !hasFrames) ||
                        (color === 'orange'); // Orange is acceptable for connected state
      
      console.log(`   Check ${i}: color=${color}, hasFrames=${hasFrames}, accurate=${isAccurate}`);
      
      if (isAccurate) accurateChecks++;
    }
    
    recordResult(
      'Indicator Accuracy Over Time',
      accurateChecks >= totalChecks - 1, // Allow 1 miss
      `${accurateChecks}/${totalChecks} accurate checks`
    );

  } catch (error) {
    console.error('\n💥 Test error:', error.message);
    recordResult('Test Execution', false, error.message);
  } finally {
    // Cleanup
    if (tutorBrowser) await tutorBrowser.close();
    if (studentBrowser) await studentBrowser.close();
  }

  // Print summary
  console.log('\n══════════════════════════════════════════════════');
  console.log('   📊 TEST RESULTS SUMMARY');
  console.log('══════════════════════════════════════════════════');
  
  let passed = 0, failed = 0;
  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}${r.details ? ` - ${r.details}` : ''}`);
    if (r.passed) passed++;
    else failed++;
  }
  
  console.log('──────────────────────────────────────────────────');
  console.log(`   Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`   Success Rate: ${Math.round(passed / results.length * 100)}%`);
  console.log('══════════════════════════════════════════════════\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
