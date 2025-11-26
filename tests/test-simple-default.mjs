#!/usr/bin/env node
/**
 * SIMPLE TEST - Default scenario (both media ON)
 * Run 10 times to check stability
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify';

async function testOnce(attempt) {
  const ROOM = `simple-test-${Date.now()}`;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 ATTEMPT ${attempt} - Default (Both Camera+Mic ON)`);
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

    // Build URLs
    const chromeUrl = `${BASE_URL}?room=${ROOM}&testUserId=1&name=ChromeUser&role=student`;
    const edgeUrl = `${BASE_URL}?room=${ROOM}&testUserId=2&name=EdgeUser&role=tutor`;

    // Navigate both browsers
    await Promise.all([
      chromePage.goto(chromeUrl),
      edgePage.goto(edgeUrl),
    ]);

    // Wait for connection (20s max)
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Check P2P connection
    const chromeP2P = await chromePage.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      return {
        exists: !!pc,
        state: pc?.connectionState,
        iceState: pc?.iceConnectionState,
        hasDataChannel: pc?.dataChannel?.readyState === 'open',
      };
    });

    const edgeP2P = await edgePage.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      return {
        exists: !!pc,
        state: pc?.connectionState,
        iceState: pc?.iceConnectionState,
        hasDataChannel: pc?.dataChannel?.readyState === 'open',
      };
    });

    const duration = Date.now() - startTime;
    const chromeOK = chromeP2P.exists && chromeP2P.state === 'connected';
    const edgeOK = edgeP2P.exists && edgeP2P.state === 'connected';
    const success = chromeOK && edgeOK;

    console.log(`   🟦 Chrome: state=${chromeP2P.state}, ice=${chromeP2P.iceState}, dataChannel=${chromeP2P.hasDataChannel}`);
    console.log(`   🟩 Edge:   state=${edgeP2P.state}, ice=${edgeP2P.iceState}, dataChannel=${edgeP2P.hasDataChannel}`);

    if (success) {
      console.log(`✅ PASS - ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    } else {
      console.log(`❌ FAIL - ${duration}ms`);
    }

    return { success, duration };

  } catch (err) {
    console.log(`❌ FAIL - ${err.message}`);
    return { success: false, duration: 0 };
  } finally {
    if (chromeBrowser) await chromeBrowser.close();
    if (edgeBrowser) await edgeBrowser.close();
  }
}

async function runTests() {
  console.log('\n🔬 SIMPLE STABILITY TEST - Default Scenario');
  console.log('Testing: Both Camera+Mic ON (10 attempts)\n');

  const attempts = [];
  let passed = 0;
  let totalTime = 0;

  for (let i = 1; i <= 10; i++) {
    const result = await testOnce(i);
    attempts.push(result);
    if (result.success) passed++;
    totalTime += result.duration;
  }

  const avgTime = totalTime / 10;
  const passRate = (passed / 10) * 100;

  console.log(`\n\n${'='.repeat(70)}`);
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}/10 (${passRate}%)`);
  console.log(`❌ Failed: ${10 - passed}/10`);
  console.log(`⏱️  Average time: ${(avgTime/1000).toFixed(1)}s`);

  if (passRate === 100) {
    console.log('\n🎉 SUCCESS - 100% stable!');
  } else {
    console.log(`\n⚠️  NEEDS FIX - ${100 - passRate}% failure rate`);
    const failed = attempts.map((a, i) => a.success ? null : i+1).filter(Boolean);
    console.log(`Failed attempts: ${failed.map(n => `#${n}`).join(', ')}`);
  }
}

runTests().catch(console.error);
