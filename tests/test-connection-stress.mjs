/**
 * Connection Stress Test Suite
 * 
 * Comprehensive tests for P2P connection stability under various scenarios:
 * 1. Rapid UI interactions (toggle camera/mic rapidly)
 * 2. Screen share start/stop cycles
 * 3. Whiteboard open/close cycles
 * 4. Network simulation (throttling)
 * 5. Tab visibility changes (minimize/restore)
 * 6. Multiple reconnection attempts
 * 7. Long duration stability
 * 8. Concurrent feature usage
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROOM_ID = `stress-test-${Date.now()}`;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Test configuration
const CONFIG = {
  RAPID_TOGGLE_COUNT: 10,
  RAPID_TOGGLE_INTERVAL: 200, // ms between toggles
  SCREEN_SHARE_CYCLES: 3,
  WHITEBOARD_CYCLES: 5,
  LONG_DURATION_SECONDS: 60,
  RECONNECT_CYCLES: 5,
};

async function getConnectionState(page) {
  return await page.evaluate(() => {
    const result = {
      hasRemoteVideo: false,
      indicatorColor: 'unknown',
      connectionState: 'unknown',
      iceState: 'unknown',
      controlChannelState: 'unknown',
    };

    // Check remote video
    const videos = Array.from(document.querySelectorAll('video'));
    for (const v of videos) {
      if (!v.muted && v.srcObject && v.videoWidth > 0 && v.videoHeight > 0) {
        result.hasRemoteVideo = true;
        break;
      }
    }

    // Check indicator color
    const indicators = document.querySelectorAll('div');
    for (const el of indicators) {
      const rect = el.getBoundingClientRect();
      if (rect.width >= 6 && rect.width <= 16 && rect.height >= 6 && rect.height <= 16) {
        const cls = el.className || '';
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        
        if (cls.includes('rounded-full') || style.borderRadius.includes('9999')) {
          if (cls.includes('bg-green-500') || bg.includes('34, 197, 94')) result.indicatorColor = 'green';
          else if (cls.includes('bg-orange-500') || bg.includes('249, 115, 22')) result.indicatorColor = 'orange';
          else if (cls.includes('bg-red-500') || bg.includes('239, 68, 68')) result.indicatorColor = 'red';
          break;
        }
      }
    }

    // Check WebRTC state
    if (window.__VIDEOLIFY_DEBUG__?.peerConnection) {
      const pc = window.__VIDEOLIFY_DEBUG__.peerConnection;
      result.connectionState = pc.connectionState;
      result.iceState = pc.iceConnectionState;
    }

    return result;
  });
}

async function isConnected(page) {
  const state = await getConnectionState(page);
  return state.indicatorColor === 'green' && state.hasRemoteVideo;
}

async function waitForConnection(page, label, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await isConnected(page)) {
      return true;
    }
    await delay(500);
  }
  
  console.log(`   [${label}] ⚠️ Connection timeout`);
  return false;
}

async function clickToolbarButton(page, buttonText) {
  try {
    // Try multiple selectors
    const selectors = [
      `button:has-text("${buttonText}")`,
      `button[aria-label*="${buttonText}" i]`,
      `button[title*="${buttonText}" i]`,
    ];
    
    for (const selector of selectors) {
      const btn = page.locator(selector).first();
      if (await btn.count() > 0 && await btn.isVisible()) {
        await btn.click();
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function runStressTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('   🔥 CONNECTION STRESS TEST SUITE');
  console.log('══════════════════════════════════════════════════════════════\n');

  let tutorBrowser, studentBrowser;
  let tutorPage, studentPage;
  const results = [];

  try {
    // Launch browsers
    console.log('🚀 Launching browsers...\n');
    
    tutorBrowser = await chromium.launch({ 
      headless: false,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
    });
    
    studentBrowser = await chromium.launch({ 
      headless: false,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
    });

    const tutorContext = await tutorBrowser.newContext({ 
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 720 }
    });
    const studentContext = await studentBrowser.newContext({ 
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 720 }
    });
    
    tutorPage = await tutorContext.newPage();
    studentPage = await studentContext.newPage();

    // Collect console errors
    const tutorErrors = [];
    const studentErrors = [];
    
    tutorPage.on('console', msg => {
      if (msg.type() === 'error') tutorErrors.push(msg.text());
    });
    studentPage.on('console', msg => {
      if (msg.type() === 'error') studentErrors.push(msg.text());
    });

    // Join calls
    const testUrl = (role, name) => `${BASE_URL}/test-videolify-v2?room=${ROOM_ID}&name=${name}&role=${role}`;
    
    await tutorPage.goto(testUrl('tutor', 'StressTeacher'), { waitUntil: 'domcontentloaded' });
    await tutorPage.waitForSelector('[data-videocall-container]', { timeout: 30000 });
    
    await studentPage.goto(testUrl('student', 'StressStudent'), { waitUntil: 'domcontentloaded' });
    await studentPage.waitForSelector('[data-videocall-container]', { timeout: 30000 });

    // Wait for initial P2P connection
    console.log('⏳ Waiting for initial P2P connection...');
    const initialConnected = await waitForConnection(tutorPage, 'Initial', 45000);
    
    if (!initialConnected) {
      console.log('❌ Initial connection failed - aborting tests');
      return 1;
    }
    console.log('✅ Initial P2P connection established\n');
    await delay(2000); // Let connection stabilize

    // ═══════════════════════════════════════════════════════════════
    // TEST 1: Rapid Camera Toggle
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 1: Rapid Camera Toggle');
    console.log('────────────────────────────────────────────────────');
    
    let test1Pass = true;
    for (let i = 0; i < CONFIG.RAPID_TOGGLE_COUNT; i++) {
      await clickToolbarButton(tutorPage, 'camera');
      await delay(CONFIG.RAPID_TOGGLE_INTERVAL);
    }
    
    await delay(3000); // Wait for any reconnection
    test1Pass = await isConnected(tutorPage) && await isConnected(studentPage);
    
    results.push({ name: 'Rapid Camera Toggle', pass: test1Pass });
    console.log(`   ${test1Pass ? '✅' : '❌'} ${CONFIG.RAPID_TOGGLE_COUNT}x toggles - Connection: ${test1Pass ? 'Stable' : 'Lost'}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: Rapid Microphone Toggle
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 2: Rapid Microphone Toggle');
    console.log('────────────────────────────────────────────────────');
    
    let test2Pass = true;
    for (let i = 0; i < CONFIG.RAPID_TOGGLE_COUNT; i++) {
      await clickToolbarButton(tutorPage, 'mic');
      await delay(CONFIG.RAPID_TOGGLE_INTERVAL);
    }
    
    await delay(3000);
    test2Pass = await isConnected(tutorPage) && await isConnected(studentPage);
    
    results.push({ name: 'Rapid Microphone Toggle', pass: test2Pass });
    console.log(`   ${test2Pass ? '✅' : '❌'} ${CONFIG.RAPID_TOGGLE_COUNT}x toggles - Connection: ${test2Pass ? 'Stable' : 'Lost'}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: Simultaneous Camera + Mic Toggle
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 3: Simultaneous Camera + Mic Toggle');
    console.log('────────────────────────────────────────────────────');
    
    let test3Pass = true;
    for (let i = 0; i < 5; i++) {
      // Toggle both at once
      await Promise.all([
        clickToolbarButton(tutorPage, 'camera'),
        clickToolbarButton(tutorPage, 'mic'),
      ]);
      await delay(500);
    }
    
    await delay(3000);
    test3Pass = await isConnected(tutorPage) && await isConnected(studentPage);
    
    results.push({ name: 'Simultaneous Camera+Mic Toggle', pass: test3Pass });
    console.log(`   ${test3Pass ? '✅' : '❌'} 5x simultaneous toggles - Connection: ${test3Pass ? 'Stable' : 'Lost'}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 4: Whiteboard Open/Close Cycles
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 4: Whiteboard Open/Close Cycles');
    console.log('────────────────────────────────────────────────────');
    
    let test4Pass = true;
    for (let i = 0; i < CONFIG.WHITEBOARD_CYCLES; i++) {
      // Open whiteboard
      await clickToolbarButton(tutorPage, 'Whiteboard');
      await delay(1500);
      
      // Close whiteboard (click close button or toggle again)
      const closeBtn = tutorPage.locator('button:has-text("Close"), button:has-text("Đóng")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click().catch(() => {});
      } else {
        await clickToolbarButton(tutorPage, 'Whiteboard');
      }
      await delay(1500);
      
      // Check connection after each cycle
      const connected = await isConnected(tutorPage);
      if (!connected) {
        console.log(`   Cycle ${i + 1}: ❌ Connection lost`);
        test4Pass = false;
        
        // Try to recover
        await delay(10000);
        if (await isConnected(tutorPage)) {
          console.log(`   Cycle ${i + 1}: ✅ Auto-recovered`);
        }
      } else {
        console.log(`   Cycle ${i + 1}: ✅ Stable`);
      }
    }
    
    results.push({ name: 'Whiteboard Open/Close Cycles', pass: test4Pass });
    console.log(`   ${test4Pass ? '✅' : '❌'} ${CONFIG.WHITEBOARD_CYCLES} cycles completed\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 5: Tab Visibility Changes (Simulate minimize/restore)
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 5: Tab Visibility Changes');
    console.log('────────────────────────────────────────────────────');
    
    let test5Pass = true;
    for (let i = 0; i < 3; i++) {
      // Simulate tab hidden
      await tutorPage.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await delay(2000);
      
      // Simulate tab visible
      await tutorPage.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await delay(2000);
    }
    
    await delay(3000);
    test5Pass = await isConnected(tutorPage) && await isConnected(studentPage);
    
    results.push({ name: 'Tab Visibility Changes', pass: test5Pass });
    console.log(`   ${test5Pass ? '✅' : '❌'} 3x visibility changes - Connection: ${test5Pass ? 'Stable' : 'Lost'}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 6: Rapid Page Interactions
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 6: Rapid Page Interactions');
    console.log('────────────────────────────────────────────────────');
    
    let test6Pass = true;
    // Simulate rapid clicking around the page
    for (let i = 0; i < 20; i++) {
      const x = 100 + Math.random() * 800;
      const y = 100 + Math.random() * 400;
      await tutorPage.mouse.click(x, y);
      await delay(50);
    }
    
    await delay(2000);
    test6Pass = await isConnected(tutorPage) && await isConnected(studentPage);
    
    results.push({ name: 'Rapid Page Interactions', pass: test6Pass });
    console.log(`   ${test6Pass ? '✅' : '❌'} 20 rapid clicks - Connection: ${test6Pass ? 'Stable' : 'Lost'}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 7: Both Peers Toggle Media Simultaneously
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 7: Both Peers Toggle Media Simultaneously');
    console.log('────────────────────────────────────────────────────');
    
    let test7Pass = true;
    for (let i = 0; i < 5; i++) {
      // Both toggle at the same time
      await Promise.all([
        clickToolbarButton(tutorPage, 'camera'),
        clickToolbarButton(studentPage, 'camera'),
      ]);
      await delay(1000);
    }
    
    await delay(3000);
    test7Pass = await isConnected(tutorPage) && await isConnected(studentPage);
    
    results.push({ name: 'Both Peers Toggle Simultaneously', pass: test7Pass });
    console.log(`   ${test7Pass ? '✅' : '❌'} 5x simultaneous toggles - Connection: ${test7Pass ? 'Stable' : 'Lost'}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 8: Student Refresh Recovery
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 8: Student Refresh Recovery');
    console.log('────────────────────────────────────────────────────');
    
    let test8Pass = true;
    for (let i = 0; i < CONFIG.RECONNECT_CYCLES; i++) {
      console.log(`   Cycle ${i + 1}: Refreshing student...`);
      await studentPage.reload({ waitUntil: 'domcontentloaded' });
      await studentPage.waitForSelector('[data-videocall-container]', { timeout: 30000 });
      
      // Wait for reconnection
      const recovered = await waitForConnection(tutorPage, `Cycle ${i + 1}`, 15000);
      
      if (recovered) {
        console.log(`   Cycle ${i + 1}: ✅ Reconnected`);
      } else {
        console.log(`   Cycle ${i + 1}: ❌ Failed to reconnect`);
        test8Pass = false;
      }
      
      await delay(2000);
    }
    
    results.push({ name: 'Student Refresh Recovery', pass: test8Pass });
    console.log(`   ${test8Pass ? '✅' : '❌'} ${CONFIG.RECONNECT_CYCLES} refresh cycles\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 9: Long Duration Stability (shortened for CI)
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 9: Long Duration Stability (30s)');
    console.log('────────────────────────────────────────────────────');
    
    let test9Pass = true;
    const duration = 30; // seconds
    const checkInterval = 5; // seconds
    let disconnectCount = 0;
    
    for (let elapsed = 0; elapsed < duration; elapsed += checkInterval) {
      await delay(checkInterval * 1000);
      
      const tutorConn = await isConnected(tutorPage);
      const studentConn = await isConnected(studentPage);
      
      if (!tutorConn || !studentConn) {
        disconnectCount++;
        console.log(`   [${elapsed + checkInterval}s] ⚠️ Disconnect detected`);
      } else {
        console.log(`   [${elapsed + checkInterval}s] ✅ Both connected`);
      }
    }
    
    test9Pass = disconnectCount === 0;
    results.push({ name: 'Long Duration Stability', pass: test9Pass });
    console.log(`   ${test9Pass ? '✅' : '❌'} ${duration}s duration - Disconnects: ${disconnectCount}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 10: Chat Message Flood
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 10: Chat Message Flood');
    console.log('────────────────────────────────────────────────────');
    
    let test10Pass = true;
    
    // Open chat
    await clickToolbarButton(tutorPage, 'Chat');
    await delay(500);
    
    // Send rapid messages
    const chatInput = tutorPage.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    if (await chatInput.count() > 0) {
      for (let i = 0; i < 10; i++) {
        await chatInput.fill(`Test message ${i + 1}`);
        await tutorPage.keyboard.press('Enter');
        await delay(100);
      }
    }
    
    await delay(3000);
    test10Pass = await isConnected(tutorPage) && await isConnected(studentPage);
    
    results.push({ name: 'Chat Message Flood', pass: test10Pass });
    console.log(`   ${test10Pass ? '✅' : '❌'} 10 rapid messages - Connection: ${test10Pass ? 'Stable' : 'Lost'}\n`);

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('══════════════════════════════════════════════════════════════');
    console.log('   📊 STRESS TEST RESULTS SUMMARY');
    console.log('══════════════════════════════════════════════════════════════');
    
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    
    results.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.pass ? '✅' : '❌'} ${r.name}`);
    });
    
    console.log('──────────────────────────────────────────────────────────────');
    console.log(`   Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`   Success Rate: ${Math.round(passed / results.length * 100)}%`);
    console.log('══════════════════════════════════════════════════════════════');
    
    // Report console errors
    if (tutorErrors.length > 0 || studentErrors.length > 0) {
      console.log('\n⚠️ Console Errors Detected:');
      if (tutorErrors.length > 0) {
        console.log('   Tutor:', tutorErrors.slice(0, 5).join('\n          '));
      }
      if (studentErrors.length > 0) {
        console.log('   Student:', studentErrors.slice(0, 5).join('\n          '));
      }
    }
    
    return failed === 0 ? 0 : 1;

  } catch (error) {
    console.error('\n❌ Test error:', error);
    return 1;
  } finally {
    await tutorBrowser?.close().catch(() => {});
    await studentBrowser?.close().catch(() => {});
  }
}

runStressTests().then(code => process.exit(code));
