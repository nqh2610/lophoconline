#!/usr/bin/env node
/**
 * MEDIA COMBINATIONS TEST - URL Params Approach
 * Set initial media state via URL parameters BEFORE joining room
 * This is more reliable than toggling after connection
 * 
 * URL format: ?video=true&audio=false
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify';

const TEST_CASES = [
  {
    name: 'Both Camera+Mic ON',
    chrome: { video: true, audio: true },
    edge: { video: true, audio: true },
  },
  {
    name: 'Both Camera ON, Mic OFF',
    chrome: { video: true, audio: false },
    edge: { video: true, audio: false },
  },
  {
    name: 'Both Camera OFF, Mic ON',
    chrome: { video: false, audio: true },
    edge: { video: false, audio: true },
  },
  {
    name: 'Both Camera+Mic OFF',
    chrome: { video: false, audio: false },
    edge: { video: false, audio: false },
  },
  {
    name: 'Chrome ON, Edge OFF',
    chrome: { video: true, audio: true },
    edge: { video: false, audio: false },
  },
  {
    name: 'Chrome OFF, Edge ON',
    chrome: { video: false, audio: false },
    edge: { video: true, audio: true },
  },
];

function buildUrl(roomId, userId, name, role, mediaSettings) {
  const params = new URLSearchParams({
    room: roomId,
    testUserId: userId,
    name: name,
    role: role,
    video: String(mediaSettings.video),
    audio: String(mediaSettings.audio),
  });
  return `${BASE_URL}?${params.toString()}`;
}

async function checkConnection(page, browserName) {
  try {
    // Wait for connection status element
    await page.waitForSelector('[data-connection-status]', { timeout: 10000 });
    
    const status = await page.evaluate(() => {
      const statusEl = document.querySelector('[data-connection-status]');
      const connected = statusEl?.getAttribute('data-connection-status') === 'connected';
      
      // Check if P2P connection established (not just signaling)
      const hasRemoteVideo = !!document.querySelector('video:not([muted])');
      const localVideo = document.querySelector('video[muted]');
      const hasLocalVideo = localVideo && localVideo.srcObject;
      
      return {
        connected,
        hasRemoteVideo,
        hasLocalVideo,
        // Check if it's real P2P (DataChannel should be open)
        hasDataChannel: window.__peerConnection?.dataChannel?.readyState === 'open',
      };
    });
    
    console.log(`   ${browserName === 'Chrome' ? '🟦' : '🟩'} ${browserName}:`, 
      `Connected=${status.connected}`,
      `P2P=${status.hasDataChannel}`,
      `LocalVideo=${status.hasLocalVideo}`,
      `RemoteVideo=${status.hasRemoteVideo}`
    );
    
    return status.connected && status.hasDataChannel;
  } catch (err) {
    console.log(`   ${browserName === 'Chrome' ? '🟦' : '🟩'} ${browserName}: ERROR - ${err.message}`);
    return false;
  }
}

async function testOnce(testCase, attempt) {
  const ROOM = `media-url-test-${Date.now()}`;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 ATTEMPT ${attempt} - ${testCase.name}`);
  console.log(`   Chrome: Video=${testCase.chrome.video}, Audio=${testCase.chrome.audio}`);
  console.log(`   Edge:   Video=${testCase.edge.video}, Audio=${testCase.edge.audio}`);
  console.log('='.repeat(70));

  let chromeBrowser, edgeBrowser;

  try {
    const startTime = Date.now();
    
    // Launch browsers
    chromeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'chrome',
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ]
    });

    edgeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'msedge',
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ]
    });

    const chromeContext = await chromeBrowser.newContext({
      permissions: ['camera', 'microphone']
    });

    const edgeContext = await edgeBrowser.newContext({
      permissions: ['camera', 'microphone']
    });

    const chromePage = await chromeContext.newPage();
    const edgePage = await edgeContext.newPage();

    // Track console errors
    const errors = [];
    chromePage.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`🟦 CHROME: ${msg.text()}`);
      }
    });
    edgePage.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`🟩 EDGE: ${msg.text()}`);
      }
    });

    // Build URLs with media params
    const chromeUrl = buildUrl(ROOM, '1', 'ChromeUser', 'student', testCase.chrome);
    const edgeUrl = buildUrl(ROOM, '2', 'EdgeUser', 'tutor', testCase.edge);

    // Navigate both browsers
    await Promise.all([
      chromePage.goto(chromeUrl),
      edgePage.goto(edgeUrl),
    ]);

    // Wait for connection (max 10s)
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check connection status
    const chromeConnected = await checkConnection(chromePage, 'Chrome');
    const edgeConnected = await checkConnection(edgePage, 'Edge');

    const duration = Date.now() - startTime;
    const success = chromeConnected && edgeConnected;

    if (success) {
      console.log(`✅ PASS - ${duration}ms (${(duration/1000).toFixed(1)}s)`);
      if (errors.length > 0) {
        console.log(`   ⚠️  ${errors.length} errors logged (non-critical)`);
      }
    } else {
      console.log(`❌ FAIL - ${duration}ms`);
      console.log(`   Chrome: Connected=${chromeConnected}`);
      console.log(`   Edge:   Connected=${edgeConnected}`);
      if (errors.length > 0) {
        console.log(`   Errors:`);
        errors.slice(0, 3).forEach(err => console.log(`     ${err}`));
      }
    }

    return { success, duration, errors: errors.length };

  } catch (err) {
    console.log(`❌ FAIL - ${err.message}`);
    return { success: false, duration: 0, errors: 0 };
  } finally {
    if (chromeBrowser) await chromeBrowser.close();
    if (edgeBrowser) await edgeBrowser.close();
  }
}

async function runTests() {
  console.log('\n🔬 MEDIA COMBINATIONS STABILITY TEST - Chrome ↔ Edge');
  console.log('Testing all camera/mic combinations with URL params\n');

  const results = [];

  for (const testCase of TEST_CASES) {
    console.log('\n' + '█'.repeat(70));
    console.log(`📋 TEST SCENARIO: ${testCase.name}`);
    console.log('█'.repeat(70));

    const attempts = [];
    let passed = 0;
    let totalTime = 0;

    for (let i = 1; i <= 5; i++) {
      const result = await testOnce(testCase, i);
      attempts.push(result);
      if (result.success) passed++;
      totalTime += result.duration;
    }

    const avgTime = totalTime / 5;
    const passRate = (passed / 5) * 100;

    console.log(`\n📊 ${testCase.name} - Summary:`);
    console.log(`   ✅ Passed: ${passed}/5 (${passRate}%)`);
    console.log(`   ❌ Failed: ${5 - passed}/5`);
    if (passed < 5) {
      const failed = attempts.map((a, i) => a.success ? null : i+1).filter(Boolean);
      console.log(`   Failed attempts: ${failed.map(n => `#${n}`).join(', ')}`);
    }
    console.log(`   ⏱️  Average time: ${(avgTime/1000).toFixed(1)}s`);

    results.push({
      name: testCase.name,
      passed,
      total: 5,
      passRate,
      avgTime,
    });
  }

  // Final summary
  console.log('\n\n' + '█'.repeat(70));
  console.log('📊 FINAL SUMMARY - All Media Combinations');
  console.log('█'.repeat(70));

  results.forEach(r => {
    const icon = r.passRate === 100 ? '✅' : '⚠️';
    console.log(`${icon} ${r.name}: ${r.passRate}% (${r.passed}/${r.total})`);
  });

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const overallRate = Math.round((totalPassed / totalTests) * 100);

  console.log(`\n🎯 OVERALL STABILITY: ${overallRate}% (${totalPassed}/${totalTests})`);

  if (overallRate < 100) {
    console.log('\n⚠️  NEEDS ATTENTION - Some combinations unstable');
    const problematic = results.filter(r => r.passRate < 100);
    console.log('\n⚠️  Problematic scenarios:');
    problematic.forEach(r => {
      console.log(`   - ${r.name}: ${r.passRate}%`);
    });
  } else {
    console.log('\n✅ ALL TESTS PASSED - Connection is 100% stable across all media combinations!');
  }
}

runTests().catch(console.error);
