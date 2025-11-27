/**
 * Connection Stability Test Suite
 * 
 * Tests connection resilience under various scenarios:
 * 1. Fresh Join - Both peers join for first time
 * 2. F5 Refresh - One peer refreshes browser
 * 3. Close & Reopen - One peer closes browser and reopens
 * 4. Network Disconnect - Simulate network loss and recovery
 * 5. Long Duration - Connection stability over time
 * 6. Idle Break - Both peers idle for 10 minutes (simulated)
 * 7. Both F5 - Both peers refresh simultaneously
 * 8. Rapid Reconnect - Multiple quick disconnects/reconnects
 */

import { chromium } from 'playwright';

// Test Configuration
const BASE_URL = 'http://localhost:3000';
const LOGIN_URL = `${BASE_URL}/login`;
const PREJOIN_URL = `${BASE_URL}/prejoin-videolify-v2?accessToken=6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae`;

// Test Accounts
const TUTOR_ACCOUNT = { username: 'tutor_mai', password: '123456', role: 'tutor' };
const STUDENT_ACCOUNT = { username: 'test', password: 'Test123456', role: 'student' };

// Timeout settings
const LOGIN_TIMEOUT = 15000;
const PREJOIN_TIMEOUT = 20000;
const P2P_CONNECTION_TIMEOUT = 45000;
const SHORT_WAIT = 2000;
const MEDIUM_WAIT = 5000;

// Test results
const testResults = [];

/**
 * Utility functions
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(label, message, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', step: '📍' };
  console.log(`${icons[type] || '•'} [${label}] ${message}`);
}

/**
 * Login helper
 */
async function login(page, account, label) {
  log(label, `Logging in as ${account.username}...`);
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
  await page.fill('#username', account.username);
  await page.fill('#password', account.password);
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: LOGIN_TIMEOUT });
    log(label, 'Login successful', 'success');
    return true;
  } catch (err) {
    log(label, 'Login failed', 'error');
    return false;
  }
}

/**
 * Join video call from prejoin
 */
async function joinFromPrejoin(page, label) {
  log(label, 'Navigating to prejoin...');
  await page.goto(PREJOIN_URL, { waitUntil: 'networkidle' });
  await sleep(SHORT_WAIT);
  
  const joinButton = await page.waitForSelector('button:has-text("Tham gia"), button:has-text("Join")', {
    timeout: PREJOIN_TIMEOUT
  });
  
  if (!joinButton) {
    log(label, 'Join button not found', 'error');
    return false;
  }
  
  await joinButton.click();
  
  try {
    await page.waitForURL(url => url.toString().includes('/video-call'), { timeout: PREJOIN_TIMEOUT });
    log(label, 'Joined video call', 'success');
    return true;
  } catch (err) {
    return true; // May already be in call
  }
}

/**
 * Check P2P connection status
 */
async function checkConnection(page) {
  return await page.evaluate(() => {
    const videos = document.querySelectorAll('video');
    let localActive = false;
    let remoteActive = false;
    
    videos.forEach(v => {
      try {
        // Check if video has rendered frames
        const hasFrames = v.videoWidth && v.videoWidth > 0;
        const hasData = v.readyState >= 2; // HAVE_CURRENT_DATA
        
        if (hasFrames || hasData) {
          // muted video is likely local, unmuted is remote
          if (v.muted) localActive = true;
          else remoteActive = true;
        }
      } catch (e) {
        // ignore
      }
    });
    
    return {
      localActive,
      remoteActive,
      connected: localActive && remoteActive,
      videoCount: videos.length
    };
  });
}

/**
 * Wait for P2P connection
 */
async function waitForConnection(page, label, timeout = P2P_CONNECTION_TIMEOUT) {
  log(label, 'Waiting for P2P connection...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const status = await checkConnection(page);
    
    if (status.remoteActive) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log(label, `Connected in ${elapsed}s`, 'success');
      return { success: true, elapsed: parseFloat(elapsed) };
    }
    
    await sleep(1000);
  }
  
  log(label, `Connection timeout after ${timeout/1000}s`, 'error');
  return { success: false, elapsed: timeout/1000 };
}

/**
 * Monitor connection for a duration
 */
async function monitorConnection(page, label, durationMs, checkIntervalMs = 5000) {
  log(label, `Monitoring connection for ${durationMs/1000}s...`);
  const startTime = Date.now();
  let disconnectCount = 0;
  let lastConnected = true;
  const disconnectEvents = [];
  
  while (Date.now() - startTime < durationMs) {
    const status = await checkConnection(page);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    
    if (status.remoteActive && !lastConnected) {
      log(label, `Reconnected at ${elapsed}s`, 'success');
      disconnectEvents.push({ type: 'reconnect', time: elapsed });
    } else if (!status.remoteActive && lastConnected) {
      disconnectCount++;
      log(label, `Disconnected at ${elapsed}s (count: ${disconnectCount})`, 'warning');
      disconnectEvents.push({ type: 'disconnect', time: elapsed });
    }
    
    lastConnected = status.remoteActive;
    await sleep(checkIntervalMs);
  }
  
  return {
    success: disconnectCount === 0,
    disconnectCount,
    disconnectEvents,
    finalConnected: lastConnected
  };
}

/**
 * Take screenshot
 */
async function screenshot(page, label, testName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tests/test-screenshots/stability/${testName}_${label}_${timestamp}.png`;
  try {
    await page.screenshot({ path: filename, fullPage: false });
  } catch (e) {}
}

/**
 * Create browser and page with permissions
 */
async function createBrowser() {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--no-sandbox',
    ],
  });
  
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });
  
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('P2P') || text.includes('SSE') || text.includes('peer') || 
        text.includes('WebRTC') || text.includes('ICE') || text.includes('Connection') ||
        msg.type() === 'error') {
      // Truncate long messages
      const shortText = text.length > 150 ? text.substring(0, 150) + '...' : text;
      console.log(`   [Browser] ${shortText}`);
    }
  });
  
  return { browser, context, page };
}

/**
 * Record test result
 */
function recordResult(testName, passed, details = {}) {
  testResults.push({
    test: testName,
    passed,
    ...details,
    timestamp: new Date().toISOString()
  });
  
  const icon = passed ? '✅' : '❌';
  console.log(`\n${icon} TEST: ${testName} - ${passed ? 'PASSED' : 'FAILED'}`);
  if (details.reason) console.log(`   Reason: ${details.reason}`);
}

// ============================================================================
// TEST CASES
// ============================================================================

/**
 * Test 1: Fresh Join - Both peers join and establish connection
 */
async function testFreshJoin(tutorBrowser, studentBrowser) {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TEST 1: Fresh Join');
  console.log('═'.repeat(60));
  
  // Use the main page from browser (already has console logging)
  const tutorPage = tutorBrowser.page;
  const studentPage = studentBrowser.page;
  
  try {
    // Login both
    await login(tutorPage, TUTOR_ACCOUNT, 'TUTOR');
    await login(studentPage, STUDENT_ACCOUNT, 'STUDENT');
    
    // Join from prejoin - tutor first
    await joinFromPrejoin(tutorPage, 'TUTOR');
    await sleep(SHORT_WAIT);
    
    // Then student
    await joinFromPrejoin(studentPage, 'STUDENT');
    
    // Wait for connection
    const [tutorResult, studentResult] = await Promise.all([
      waitForConnection(tutorPage, 'TUTOR'),
      waitForConnection(studentPage, 'STUDENT')
    ]);
    
    const passed = tutorResult.success && studentResult.success;
    recordResult('Fresh Join', passed, {
      tutorConnectTime: tutorResult.elapsed,
      studentConnectTime: studentResult.elapsed
    });
    
    await screenshot(tutorPage, 'TUTOR', 'FreshJoin');
    await screenshot(studentPage, 'STUDENT', 'FreshJoin');
    
    return { tutorPage, studentPage, passed };
    
  } catch (err) {
    recordResult('Fresh Join', false, { reason: err.message });
    return { tutorPage: tutorBrowser.page, studentPage: studentBrowser.page, passed: false };
  }
}

/**
 * Test 2: F5 Refresh - One peer refreshes, check reconnection
 */
async function testF5Refresh(tutorPage, studentPage) {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TEST 2: F5 Refresh (Tutor refreshes)');
  console.log('═'.repeat(60));
  
  try {
    // Verify initial connection
    let status = await checkConnection(studentPage);
    if (!status.remoteActive) {
      recordResult('F5 Refresh', false, { reason: 'No initial connection' });
      return false;
    }
    
    log('TUTOR', 'Pressing F5 to refresh...', 'step');
    
    // Use keyboard F5 instead of reload to avoid networkidle timeout
    await tutorPage.keyboard.press('F5');
    
    // Wait for page to start reloading
    await sleep(3000);
    
    // Student should detect disconnect
    status = await checkConnection(studentPage);
    log('STUDENT', `After tutor F5: remote=${status.remoteActive}`, 'info');
    
    // Wait for page to fully load
    try {
      await tutorPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
    } catch (e) {
      log('TUTOR', 'Page still loading...', 'warning');
    }
    
    await sleep(5000);
    
    // Wait for both to reconnect
    const [tutorResult, studentResult] = await Promise.all([
      waitForConnection(tutorPage, 'TUTOR', 30000),
      waitForConnection(studentPage, 'STUDENT', 30000)
    ]);
    
    const passed = tutorResult.success && studentResult.success;
    recordResult('F5 Refresh', passed, {
      tutorReconnectTime: tutorResult.elapsed,
      studentReconnectTime: studentResult.elapsed,
      note: passed ? 'Auto-reconnected after F5' : 'Failed to reconnect - may need manual rejoin'
    });
    
    await screenshot(tutorPage, 'TUTOR', 'F5Refresh');
    await screenshot(studentPage, 'STUDENT', 'F5Refresh');
    
    return passed;
    
  } catch (err) {
    recordResult('F5 Refresh', false, { reason: err.message });
    return false;
  }
}

/**
 * Test 3: Close & Reopen - One peer closes browser tab and reopens
 */
async function testCloseReopen(tutorBrowser, studentPage, tutorPage) {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TEST 3: Close & Reopen (Tutor closes and reopens)');
  console.log('═'.repeat(60));
  
  let newTutorPage;
  
  try {
    // Check initial connection
    let status = await checkConnection(studentPage);
    log('STUDENT', `Initial connection: remote=${status.remoteActive}`, 'info');
    
    // Navigate tutor to a blank page (simulating close)
    log('TUTOR', 'Navigating away (simulating close)...', 'step');
    await tutorPage.goto('about:blank');
    
    await sleep(SHORT_WAIT);
    
    // Check student detects disconnect
    status = await checkConnection(studentPage);
    log('STUDENT', `After tutor leaves: remote=${status.remoteActive}`, 'info');
    
    // Tutor reopens - navigate back to prejoin and join
    log('TUTOR', 'Rejoining from prejoin...', 'step');
    
    // Login and join again using same page
    await login(tutorPage, TUTOR_ACCOUNT, 'TUTOR');
    await joinFromPrejoin(tutorPage, 'TUTOR');
    
    // Wait for reconnection
    const [tutorResult, studentResult] = await Promise.all([
      waitForConnection(tutorPage, 'TUTOR', 30000),
      waitForConnection(studentPage, 'STUDENT', 30000)
    ]);
    
    const passed = tutorResult.success && studentResult.success;
    recordResult('Close & Reopen', passed, {
      tutorReconnectTime: tutorResult.elapsed,
      studentReconnectTime: studentResult.elapsed
    });
    
    await screenshot(tutorPage, 'TUTOR', 'CloseReopen');
    await screenshot(studentPage, 'STUDENT', 'CloseReopen');
    
    return { newTutorPage: tutorPage, passed };
    
  } catch (err) {
    recordResult('Close & Reopen', false, { reason: err.message });
    return { newTutorPage: tutorPage, passed: false };
  }
}

/**
 * Test 4: Network Disconnect - Simulate network going offline then online
 */
async function testNetworkDisconnect(tutorPage, studentPage) {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TEST 4: Network Disconnect (Student goes offline)');
  console.log('═'.repeat(60));
  
  try {
    // Verify initial connection
    let status = await checkConnection(tutorPage);
    if (!status.remoteActive) {
      recordResult('Network Disconnect', false, { reason: 'No initial connection' });
      return false;
    }
    
    log('STUDENT', 'Going offline...', 'step');
    const studentContext = studentPage.context();
    await studentContext.setOffline(true);
    
    // Wait and check tutor status
    await sleep(MEDIUM_WAIT);
    status = await checkConnection(tutorPage);
    log('TUTOR', `After student offline: remote=${status.remoteActive}`, 'info');
    
    // Student comes back online
    log('STUDENT', 'Coming back online...', 'step');
    await studentContext.setOffline(false);
    
    // Wait for reconnection
    await sleep(MEDIUM_WAIT);
    
    const [tutorResult, studentResult] = await Promise.all([
      waitForConnection(tutorPage, 'TUTOR', 30000),
      waitForConnection(studentPage, 'STUDENT', 30000)
    ]);
    
    const passed = tutorResult.success && studentResult.success;
    recordResult('Network Disconnect', passed, {
      reason: passed ? 'Auto-reconnected after network recovery' : 'Failed to reconnect',
      tutorReconnectTime: tutorResult.elapsed,
      studentReconnectTime: studentResult.elapsed
    });
    
    await screenshot(tutorPage, 'TUTOR', 'NetworkDisconnect');
    await screenshot(studentPage, 'STUDENT', 'NetworkDisconnect');
    
    return passed;
    
  } catch (err) {
    recordResult('Network Disconnect', false, { reason: err.message });
    return false;
  }
}

/**
 * Test 5: Long Duration - Monitor connection for extended period
 */
async function testLongDuration(tutorPage, studentPage, durationSeconds = 60) {
  console.log('\n' + '═'.repeat(60));
  console.log(`🧪 TEST 5: Long Duration (${durationSeconds}s stability test)`);
  console.log('═'.repeat(60));
  
  try {
    // Verify initial connection
    let status = await checkConnection(tutorPage);
    if (!status.remoteActive) {
      recordResult('Long Duration', false, { reason: 'No initial connection' });
      return false;
    }
    
    log('BOTH', `Starting ${durationSeconds}s stability monitoring...`, 'step');
    
    const result = await monitorConnection(tutorPage, 'TUTOR', durationSeconds * 1000, 5000);
    
    const passed = result.success && result.finalConnected;
    recordResult('Long Duration', passed, {
      duration: durationSeconds,
      disconnectCount: result.disconnectCount,
      disconnectEvents: result.disconnectEvents,
      finalConnected: result.finalConnected
    });
    
    await screenshot(tutorPage, 'TUTOR', 'LongDuration');
    await screenshot(studentPage, 'STUDENT', 'LongDuration');
    
    return passed;
    
  } catch (err) {
    recordResult('Long Duration', false, { reason: err.message });
    return false;
  }
}

/**
 * Test 6: Idle Break - Simulate 10 minute break (accelerated)
 */
async function testIdleBreak(tutorPage, studentPage, idleSeconds = 30) {
  console.log('\n' + '═'.repeat(60));
  console.log(`🧪 TEST 6: Idle Break (${idleSeconds}s idle simulation)`);
  console.log('═'.repeat(60));
  
  try {
    // Verify initial connection
    let status = await checkConnection(tutorPage);
    if (!status.remoteActive) {
      recordResult('Idle Break', false, { reason: 'No initial connection' });
      return false;
    }
    
    log('BOTH', `Both peers going idle for ${idleSeconds}s...`, 'step');
    
    // Just wait without any interaction
    const startTime = Date.now();
    let checkCount = 0;
    
    while (Date.now() - startTime < idleSeconds * 1000) {
      await sleep(10000); // Check every 10 seconds
      checkCount++;
      
      const tutorStatus = await checkConnection(tutorPage);
      const studentStatus = await checkConnection(studentPage);
      
      log('BOTH', `Idle check ${checkCount}: tutor=${tutorStatus.remoteActive}, student=${studentStatus.remoteActive}`, 'info');
    }
    
    // Final check
    const tutorStatus = await checkConnection(tutorPage);
    const studentStatus = await checkConnection(studentPage);
    
    const passed = tutorStatus.remoteActive && studentStatus.remoteActive;
    recordResult('Idle Break', passed, {
      idleDuration: idleSeconds,
      tutorFinalConnected: tutorStatus.remoteActive,
      studentFinalConnected: studentStatus.remoteActive
    });
    
    await screenshot(tutorPage, 'TUTOR', 'IdleBreak');
    await screenshot(studentPage, 'STUDENT', 'IdleBreak');
    
    return passed;
    
  } catch (err) {
    recordResult('Idle Break', false, { reason: err.message });
    return false;
  }
}

/**
 * Test 7: Both F5 - Both peers refresh simultaneously
 */
async function testBothF5(tutorPage, studentPage) {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TEST 7: Both F5 (Both peers refresh simultaneously)');
  console.log('═'.repeat(60));
  
  try {
    // Verify initial connection
    let status = await checkConnection(tutorPage);
    if (!status.remoteActive) {
      recordResult('Both F5', false, { reason: 'No initial connection' });
      return false;
    }
    
    log('BOTH', 'Both pressing F5 simultaneously...', 'step');
    
    // Refresh both at same time using keyboard
    await Promise.all([
      tutorPage.keyboard.press('F5'),
      studentPage.keyboard.press('F5')
    ]);
    
    // Wait for pages to reload
    await sleep(5000);
    
    // Wait for domcontentloaded
    await Promise.all([
      tutorPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {}),
      studentPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {})
    ]);
    
    await sleep(5000);
    
    // Wait for both to reconnect
    const [tutorResult, studentResult] = await Promise.all([
      waitForConnection(tutorPage, 'TUTOR', 30000),
      waitForConnection(studentPage, 'STUDENT', 30000)
    ]);
    
    const passed = tutorResult.success && studentResult.success;
    recordResult('Both F5', passed, {
      tutorReconnectTime: tutorResult.elapsed,
      studentReconnectTime: studentResult.elapsed
    });
    
    await screenshot(tutorPage, 'TUTOR', 'BothF5');
    await screenshot(studentPage, 'STUDENT', 'BothF5');
    
    return passed;
    
  } catch (err) {
    recordResult('Both F5', false, { reason: err.message });
    return false;
  }
}

/**
 * Test 8: Rapid Reconnect - Multiple quick disconnects/reconnects
 */
async function testRapidReconnect(tutorPage, studentPage) {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TEST 8: Rapid Reconnect (3 quick F5 cycles)');
  console.log('═'.repeat(60));
  
  try {
    // First verify we have connection
    let status = await checkConnection(tutorPage);
    if (!status.remoteActive) {
      recordResult('Rapid Reconnect', false, { reason: 'No initial connection' });
      return false;
    }
    
    let successCount = 0;
    const cycles = 3;
    
    for (let i = 1; i <= cycles; i++) {
      log('TUTOR', `Rapid F5 cycle ${i}/${cycles}...`, 'step');
      
      await tutorPage.keyboard.press('F5');
      await sleep(3000);
      
      try {
        await tutorPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
      } catch (e) {}
      
      await sleep(3000);
      
      const result = await waitForConnection(tutorPage, 'TUTOR', 25000);
      if (result.success) {
        successCount++;
        log('BOTH', `Cycle ${i} reconnected in ${result.elapsed}s`, 'success');
      } else {
        log('BOTH', `Cycle ${i} failed to reconnect`, 'error');
      }
      
      await sleep(SHORT_WAIT);
    }
    
    const passed = successCount === cycles;
    recordResult('Rapid Reconnect', passed, {
      cycles,
      successCount,
      successRate: `${(successCount/cycles*100).toFixed(0)}%`
    });
    
    await screenshot(tutorPage, 'TUTOR', 'RapidReconnect');
    await screenshot(studentPage, 'STUDENT', 'RapidReconnect');
    
    return passed;
    
  } catch (err) {
    recordResult('Rapid Reconnect', false, { reason: err.message });
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('═'.repeat(70));
  console.log('🧪 CONNECTION STABILITY TEST SUITE');
  console.log('═'.repeat(70));
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👨‍🏫 Tutor: ${TUTOR_ACCOUNT.username}`);
  console.log(`👨‍🎓 Student: ${STUDENT_ACCOUNT.username}`);
  console.log('═'.repeat(70));
  
  // Create screenshot directory
  const { mkdirSync } = await import('fs');
  try { mkdirSync('tests/test-screenshots/stability', { recursive: true }); } catch (e) {}
  
  let tutorBrowser, studentBrowser;
  let tutorPage, studentPage;
  
  try {
    // Launch browsers
    console.log('\n📦 Launching browsers...');
    [tutorBrowser, studentBrowser] = await Promise.all([
      createBrowser(),
      createBrowser()
    ]);
    console.log('✅ Browsers launched\n');
    
    // Test 1: Fresh Join
    const freshJoinResult = await testFreshJoin(tutorBrowser, studentBrowser);
    tutorPage = freshJoinResult.tutorPage;
    studentPage = freshJoinResult.studentPage;
    
    if (!freshJoinResult.passed) {
      throw new Error('Fresh join failed, cannot continue tests');
    }
    
    await sleep(MEDIUM_WAIT);
    
    // Test 2: F5 Refresh
    await testF5Refresh(tutorPage, studentPage);
    await sleep(MEDIUM_WAIT);
    
    // Test 3: Close & Reopen
    const closeReopenResult = await testCloseReopen(tutorBrowser, studentPage, tutorPage);
    if (closeReopenResult.newTutorPage) {
      tutorPage = closeReopenResult.newTutorPage;
    }
    await sleep(MEDIUM_WAIT);
    
    // Test 4: Network Disconnect
    await testNetworkDisconnect(tutorPage, studentPage);
    await sleep(MEDIUM_WAIT);
    
    // Test 5: Long Duration (60 seconds)
    await testLongDuration(tutorPage, studentPage, 60);
    await sleep(MEDIUM_WAIT);
    
    // Test 6: Idle Break (30 seconds - simulated 10 min break)
    await testIdleBreak(tutorPage, studentPage, 30);
    await sleep(MEDIUM_WAIT);
    
    // Test 7: Both F5
    await testBothF5(tutorPage, studentPage);
    await sleep(MEDIUM_WAIT);
    
    // Test 8: Rapid Reconnect
    await testRapidReconnect(tutorPage, studentPage);
    
  } catch (err) {
    console.error('\n❌ TEST SUITE ERROR:', err.message);
  } finally {
    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(70));
    
    let passCount = 0;
    let failCount = 0;
    
    testResults.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.test}`);
      if (r.passed) passCount++;
      else failCount++;
    });
    
    console.log('\n' + '─'.repeat(70));
    console.log(`Total: ${testResults.length} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log(`Success Rate: ${((passCount / testResults.length) * 100).toFixed(0)}%`);
    console.log('═'.repeat(70));
    
    // Keep browsers open for inspection
    console.log('\n⏳ Keeping browsers open for 15 seconds for inspection...');
    await sleep(15000);
    
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (tutorBrowser?.browser) await tutorBrowser.browser.close();
    if (studentBrowser?.browser) await studentBrowser.browser.close();
    
    console.log('✅ Test suite completed');
  }
}

// Run tests
runAllTests().catch(console.error);
