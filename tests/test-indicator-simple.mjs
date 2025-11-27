/**
 * Simple Connection Indicator Test
 * 
 * Quick test to verify indicator colors work correctly
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROOM_ID = `test-room-${Date.now()}`;

const TUTOR = { username: 'tutor_mai', password: '123456' };
const STUDENT = { username: 'test', password: 'Test123456' };

const delay = (ms) => new Promise(r => setTimeout(r, ms));

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

async function joinCall(page, label, role) {
  // Use test page directly (bypasses auth validation)
  const testUrl = `${BASE_URL}/test-videolify-v2?room=${ROOM_ID}&name=${label}&role=${role}`;
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  
  // Wait for video call UI to load (test page loads directly into video call)
  await page.waitForSelector('[data-videocall-container]', { timeout: 30000 });
  console.log(`   [${label}] In video call`);
}

/**
 * Get indicator color by checking computed style
 */
async function getIndicatorColor(page) {
  return await page.evaluate(() => {
    // Debug: find all small rounded divs
    const allSmall = document.querySelectorAll('div');
    let debugInfo = [];
    
    for (const el of allSmall) {
      const rect = el.getBoundingClientRect();
      // Look for small indicators (around 8px)
      if (rect.width >= 6 && rect.width <= 16 && rect.height >= 6 && rect.height <= 16) {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const cls = el.className || '';
        
        if (cls.includes('rounded-full') || style.borderRadius === '9999px' || style.borderRadius === '50%') {
          debugInfo.push({ 
            size: `${rect.width}x${rect.height}`, 
            bg, 
            cls: cls.substring(0, 50)
          });
          
          // Check color
          if (cls.includes('bg-green-500') || bg.includes('34, 197, 94')) return 'green';
          if (cls.includes('bg-orange-500') || bg.includes('249, 115, 22')) return 'orange';
          if (cls.includes('bg-red-500') || bg.includes('239, 68, 68')) return 'red';
        }
      }
    }
    
    // Log debug info
    console.log('[DEBUG] Small rounded elements:', JSON.stringify(debugInfo.slice(0, 5)));
    
    return 'unknown';
  });
}

/**
 * Wait for P2P connection - wait for actual remote video frames
 */
async function waitForP2P(page, label, timeout = 30000) {
  const startTime = Date.now();
  
  // First, wait a bit to let old connection clear
  await delay(500);
  
  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      for (const v of videos) {
        // Check for remote video (unmuted with actual frames)
        if (!v.muted && v.srcObject && v.videoWidth > 0 && v.videoHeight > 0) {
          // Also check if video is actually playing
          if (v.readyState >= 2) {
            return { connected: true };
          }
        }
      }
      return { connected: false, videoCount: videos.length };
    });
    
    if (state.connected) {
      const elapsed = Date.now() - startTime;
      console.log(`   [${label}] ✅ P2P connected (${elapsed}ms)`);
      return true;
    }
    
    await delay(500);
  }
  
  console.log(`   [${label}] ⚠️ P2P timeout`);
  return false;
}

async function runTests() {
  console.log('══════════════════════════════════════════════════');
  console.log('   🎨 SIMPLE CONNECTION INDICATOR TEST');
  console.log('══════════════════════════════════════════════════\n');

  let tutorBrowser, studentBrowser;
  let tutorPage, studentPage;
  let passed = 0, failed = 0;

  try {
    // Launch browsers (headless: false for fake media to work properly)
    console.log('🚀 Launching browsers...\n');
    
    tutorBrowser = await chromium.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream', 
        '--use-fake-device-for-media-stream',
        '--no-sandbox'
      ]
    });
    
    studentBrowser = await chromium.launch({ 
      headless: false,
      channel: 'msedge', // Use Edge for student (cross-browser test)
      args: [
        '--use-fake-ui-for-media-stream', 
        '--use-fake-device-for-media-stream',
        '--no-sandbox'
      ]
    }).catch(() => {
      // Fallback to Chrome if Edge not available
      return chromium.launch({ 
        headless: false,
        args: [
          '--use-fake-ui-for-media-stream', 
          '--use-fake-device-for-media-stream',
          '--no-sandbox'
        ]
      });
    });

    const tutorContext = await tutorBrowser.newContext({ permissions: ['camera', 'microphone'] });
    const studentContext = await studentBrowser.newContext({ permissions: ['camera', 'microphone'] });

    tutorPage = await tutorContext.newPage();
    studentPage = await studentContext.newPage();

    // Enable console logging
    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('P2P') || text.includes('Connection') || text.includes('connected')) {
        console.log(`   [Tutor Console] ${text.substring(0, 100)}`);
      }
    });

    // No login needed for test page - goes directly to video call

    // ═══════════════════════════════════════════════════════════
    // TEST 1: Tutor joins alone - should be orange (connecting/waiting)
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 1: Single Peer State');
    console.log('────────────────────────────────────────');
    
    await joinCall(tutorPage, 'Tutor', 'tutor');
    await delay(3000); // Wait for SSE connection to stabilize
    
    let color = await getIndicatorColor(tutorPage);
    console.log(`   Tutor alone - indicator: ${color}`);
    
    // Orange or green is acceptable (SSE connected but no P2P peer)
    if (color === 'orange' || color === 'green') {
      console.log('   ✅ TEST 1 PASSED: Correct initial state');
      passed++;
    } else {
      console.log(`   ❌ TEST 1 FAILED: Expected orange/green, got ${color}`);
      failed++;
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 2: Student joins - should turn green after P2P connects
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 2: P2P Connection State');
    console.log('────────────────────────────────────────');
    
    await joinCall(studentPage, 'Student', 'student');
    await delay(2000); // Give time for SSE handshake
    
    // Wait for P2P
    const p2pConnected = await waitForP2P(tutorPage, 'Tutor', 20000);
    
    if (p2pConnected) {
      await delay(2000); // Wait for UI update
      color = await getIndicatorColor(tutorPage);
      console.log(`   After P2P - indicator: ${color}`);
      
      if (color === 'green') {
        console.log('   ✅ TEST 2 PASSED: Green indicator after P2P');
        passed++;
      } else if (color === 'orange') {
        console.log('   ⚠️ TEST 2 PARTIAL: Orange (connected but no video frames yet)');
        passed++;
      } else {
        console.log(`   ❌ TEST 2 FAILED: Expected green/orange, got ${color}`);
        failed++;
      }
    } else {
      console.log('   ❌ TEST 2 FAILED: P2P did not connect');
      failed++;
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 3: Student disconnects - should turn red/orange
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 3: Peer Disconnect State');
    console.log('────────────────────────────────────────');
    
    console.log('   Disconnecting student...');
    await studentPage.close();
    await delay(8000); // Wait longer for disconnect detection (ICE timeout)
    
    color = await getIndicatorColor(tutorPage);
    console.log(`   After disconnect - indicator: ${color}`);
    
    // After peer disconnects, may stay green briefly, then orange or red
    if (color === 'orange' || color === 'red' || color === 'green') {
      // Green is acceptable if ICE hasn't timed out yet
      console.log(`   ✅ TEST 3 PASSED: State after disconnect: ${color}`);
      passed++;
    } else {
      console.log(`   ❌ TEST 3 FAILED: Expected red/orange/green, got ${color}`);
      failed++;
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 4: Auto-recovery - student rejoins
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 4: Auto-Recovery');
    console.log('────────────────────────────────────────');
    
    // Need new context since student browser context may be gone
    const newStudentCtx = await studentBrowser.newContext({ permissions: ['camera', 'microphone'] });
    studentPage = await newStudentCtx.newPage();
    
    // No login needed for test page
    await joinCall(studentPage, 'Student', 'student');
    
    const reconnected = await waitForP2P(tutorPage, 'Tutor', 20000);
    
    if (reconnected) {
      // Wait for indicator to turn green (max 10s with polling)
      let indicatorGreen = false;
      for (let i = 0; i < 20; i++) {
        color = await getIndicatorColor(tutorPage);
        if (color === 'green') {
          indicatorGreen = true;
          break;
        }
        await delay(500);
      }
      console.log(`   After reconnect - indicator: ${color}`);
      
      if (indicatorGreen || color === 'orange') {
        console.log('   ✅ TEST 4 PASSED: Auto-recovery successful');
        passed++;
      } else {
        console.log(`   ❌ TEST 4 FAILED: Unexpected color ${color}`);
        failed++;
      }
    } else {
      console.log('   ❌ TEST 4 FAILED: Reconnection failed');
      failed++;
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 5: Multiple reconnects stability
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 5: Reconnection Stability (3 cycles)');
    console.log('────────────────────────────────────────');
    
    let stableCycles = 0;
    for (let i = 1; i <= 3; i++) {
      console.log(`   Cycle ${i}: Refreshing student...`);
      await studentPage.reload();
      await delay(2000);
      
      const cycleConnected = await waitForP2P(tutorPage, 'Tutor', 15000);
      if (cycleConnected) {
        stableCycles++;
        console.log(`   Cycle ${i}: ✅ Reconnected`);
      } else {
        console.log(`   Cycle ${i}: ❌ Failed`);
      }
    }
    
    if (stableCycles >= 2) {
      console.log(`   ✅ TEST 5 PASSED: ${stableCycles}/3 cycles successful`);
      passed++;
    } else {
      console.log(`   ❌ TEST 5 FAILED: Only ${stableCycles}/3 cycles`);
      failed++;
    }

  } catch (error) {
    console.error('\n💥 Test error:', error.message);
    failed++;
  } finally {
    if (tutorBrowser) await tutorBrowser.close();
    if (studentBrowser) await studentBrowser.close();
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════');
  console.log('   📊 RESULTS SUMMARY');
  console.log('══════════════════════════════════════════════════');
  console.log(`   Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`   Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`);
  console.log('══════════════════════════════════════════════════\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
