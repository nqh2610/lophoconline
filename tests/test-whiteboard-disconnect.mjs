/**
 * Whiteboard Disconnect Test
 * 
 * Tests that closing whiteboard doesn't cause hidden disconnection
 * and that indicator correctly reflects connection status
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROOM_ID = `wb-test-${Date.now()}`;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function getIndicatorColor(page) {
  return await page.evaluate(() => {
    const indicators = document.querySelectorAll('div');
    for (const el of indicators) {
      const rect = el.getBoundingClientRect();
      if (rect.width >= 6 && rect.width <= 16 && rect.height >= 6 && rect.height <= 16) {
        const cls = el.className || '';
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        
        if (cls.includes('rounded-full') || style.borderRadius.includes('9999') || style.borderRadius === '50%') {
          if (cls.includes('bg-green-500') || bg.includes('34, 197, 94')) return 'green';
          if (cls.includes('bg-orange-500') || bg.includes('249, 115, 22')) return 'orange';
          if (cls.includes('bg-red-500') || bg.includes('239, 68, 68')) return 'red';
        }
      }
    }
    return 'unknown';
  });
}

async function waitForP2P(page, label, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      for (const v of videos) {
        if (!v.muted && v.srcObject && v.videoWidth > 0 && v.videoHeight > 0 && v.readyState >= 2) {
          return { connected: true };
        }
      }
      return { connected: false };
    });
    
    if (state.connected) {
      console.log(`   [${label}] ✅ P2P connected (${Date.now() - startTime}ms)`);
      return true;
    }
    
    await delay(500);
  }
  
  console.log(`   [${label}] ⚠️ P2P timeout`);
  return false;
}

async function checkConnectionHealth(page) {
  return await page.evaluate(() => {
    // Check multiple indicators of connection health
    const result = {
      hasRemoteVideo: false,
      controlChannelOpen: false,
      connectionState: 'unknown',
      indicatorColor: 'unknown'
    };

    // Check remote video
    const videos = Array.from(document.querySelectorAll('video'));
    for (const v of videos) {
      if (!v.muted && v.srcObject && v.videoWidth > 0) {
        result.hasRemoteVideo = true;
        break;
      }
    }

    // Check control channel via debug
    if (window.__VIDEOLIFY_DEBUG__) {
      const pc = window.__VIDEOLIFY_DEBUG__.peerConnection;
      if (pc) {
        result.connectionState = pc.connectionState;
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

    return result;
  });
}

async function runTest() {
  console.log('══════════════════════════════════════════════════');
  console.log('   📋 WHITEBOARD DISCONNECT TEST');
  console.log('══════════════════════════════════════════════════\n');

  let tutorBrowser, studentBrowser;
  let passed = 0, failed = 0;

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

    const tutorContext = await tutorBrowser.newContext({ permissions: ['camera', 'microphone'] });
    const studentContext = await studentBrowser.newContext({ permissions: ['camera', 'microphone'] });
    
    const tutorPage = await tutorContext.newPage();
    const studentPage = await studentContext.newPage();

    // Enable console logging
    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('channel') || text.includes('CLOSE') || text.includes('reconnect') || text.includes('whiteboard')) {
        console.log(`   [Tutor Console] ${text.substring(0, 100)}`);
      }
    });

    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('channel') || text.includes('CLOSE') || text.includes('reconnect') || text.includes('whiteboard')) {
        console.log(`   [Student Console] ${text.substring(0, 100)}`);
      }
    });

    // Join calls
    const testUrl = (role, name) => `${BASE_URL}/test-videolify-v2?room=${ROOM_ID}&name=${name}&role=${role}`;
    
    await tutorPage.goto(testUrl('tutor', 'Teacher'), { waitUntil: 'domcontentloaded' });
    await tutorPage.waitForSelector('[data-videocall-container]', { timeout: 30000 });
    console.log('   [Tutor] In video call');

    await studentPage.goto(testUrl('student', 'Student'), { waitUntil: 'domcontentloaded' });
    await studentPage.waitForSelector('[data-videocall-container]', { timeout: 30000 });
    console.log('   [Student] In video call');

    // Wait for P2P
    const p2pConnected = await waitForP2P(tutorPage, 'Tutor');
    await waitForP2P(studentPage, 'Student');

    if (!p2pConnected) {
      throw new Error('P2P connection failed');
    }

    // ═══════════════════════════════════════════════════════
    // TEST 1: Open whiteboard and verify connection stable
    // ═══════════════════════════════════════════════════════
    console.log('\n📋 TEST 1: Open Whiteboard');
    console.log('────────────────────────────────────────');

    // Click whiteboard button
    const whiteboardBtn = await tutorPage.locator('button:has-text("Whiteboard"), button[aria-label*="whiteboard"], button:has(svg)').filter({ hasText: /bảng|board|white/i }).first();
    
    if (await whiteboardBtn.count() === 0) {
      // Try finding by icon or other means
      await tutorPage.click('[data-testid="whiteboard-btn"]').catch(() => {});
    } else {
      await whiteboardBtn.click().catch(() => {});
    }

    await delay(2000);

    // Check if whiteboard is visible on student
    const studentWhiteboard = await studentPage.locator('[data-testid="whiteboard-panel"], .excalidraw, canvas').first();
    const whiteboardVisible = await studentWhiteboard.isVisible().catch(() => false);

    let health1 = await checkConnectionHealth(tutorPage);
    console.log('   After open whiteboard:', health1);

    if (health1.indicatorColor === 'green' && health1.hasRemoteVideo) {
      console.log('   ✅ TEST 1 PASSED: Connection stable after opening whiteboard');
      passed++;
    } else {
      console.log('   ❌ TEST 1 FAILED: Connection unstable after opening whiteboard');
      failed++;
    }

    // ═══════════════════════════════════════════════════════
    // TEST 2: Close whiteboard and verify no hidden disconnect
    // ═══════════════════════════════════════════════════════
    console.log('\n📋 TEST 2: Close Whiteboard');
    console.log('────────────────────────────────────────');

    // Find and click close button
    const closeBtn = await tutorPage.locator('button:has-text("Close"), button:has-text("Đóng"), [data-testid="close-whiteboard"]').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click().catch(() => {});
    }

    // Wait for any reconnection to settle
    await delay(3000);

    // Check connection health
    let health2 = await checkConnectionHealth(tutorPage);
    let studentHealth2 = await checkConnectionHealth(studentPage);
    
    console.log('   Tutor after close:', health2);
    console.log('   Student after close:', studentHealth2);

    // Both should still be green and have video
    if (health2.indicatorColor === 'green' && studentHealth2.indicatorColor === 'green' &&
        health2.hasRemoteVideo && studentHealth2.hasRemoteVideo) {
      console.log('   ✅ TEST 2 PASSED: Both sides still connected after closing whiteboard');
      passed++;
    } else if (health2.indicatorColor !== 'green' || studentHealth2.indicatorColor !== 'green') {
      // If indicator shows not-green, check if it auto-recovers
      console.log('   ⚠️ Connection dropped - checking auto-recovery...');
      await delay(10000); // Wait for auto-reconnect
      
      health2 = await checkConnectionHealth(tutorPage);
      studentHealth2 = await checkConnectionHealth(studentPage);
      
      if (health2.indicatorColor === 'green' && studentHealth2.indicatorColor === 'green') {
        console.log('   ✅ TEST 2 PASSED: Auto-recovered after whiteboard close');
        passed++;
      } else {
        console.log('   ❌ TEST 2 FAILED: Failed to recover after whiteboard close');
        failed++;
      }
    } else {
      console.log('   ❌ TEST 2 FAILED: Hidden disconnect detected');
      failed++;
    }

    // ═══════════════════════════════════════════════════════
    // TEST 3: Indicator consistency check
    // ═══════════════════════════════════════════════════════
    console.log('\n📋 TEST 3: Indicator Consistency');
    console.log('────────────────────────────────────────');

    // If indicator is green, remote video must work
    // If no remote video, indicator must not be green
    
    const tutorIndicator = await getIndicatorColor(tutorPage);
    const studentIndicator = await getIndicatorColor(studentPage);
    
    const tutorHasVideo = (await checkConnectionHealth(tutorPage)).hasRemoteVideo;
    const studentHasVideo = (await checkConnectionHealth(studentPage)).hasRemoteVideo;

    console.log('   Tutor: indicator=' + tutorIndicator + ', hasVideo=' + tutorHasVideo);
    console.log('   Student: indicator=' + studentIndicator + ', hasVideo=' + studentHasVideo);

    const consistent = 
      (tutorIndicator === 'green') === tutorHasVideo &&
      (studentIndicator === 'green') === studentHasVideo;

    if (consistent) {
      console.log('   ✅ TEST 3 PASSED: Indicator matches actual connection state');
      passed++;
    } else {
      console.log('   ❌ TEST 3 FAILED: Indicator inconsistent with connection state');
      failed++;
    }

    // ═══════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════════════');
    console.log('   📊 RESULTS SUMMARY');
    console.log('══════════════════════════════════════════════════');
    console.log(`   Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`   Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`);
    console.log('══════════════════════════════════════════════════\n');

    return failed === 0 ? 0 : 1;

  } catch (error) {
    console.error('\n❌ Test error:', error);
    return 1;
  } finally {
    await tutorBrowser?.close().catch(() => {});
    await studentBrowser?.close().catch(() => {});
  }
}

runTest().then(code => process.exit(code));
