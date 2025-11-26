/**
 * Test 23: Real Cross-Browser Test (Chromium + Edge) using Playwright
 * 
 * Priority: CRITICAL
 * 
 * Tests cross-browser compatibility between Chromium and Microsoft Edge
 */

import { chromium, _electron as electron } from 'playwright';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';

console.log('🎬 Test 23: REAL Cross-Browser (Chromium + Edge with Playwright)');
console.log('=' .repeat(70));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  let browserChromium, browserEdge;
  let contextChromium, contextEdge;
  let pageChromium, pageEdge;
  
  try {
    // Launch Chromium
    console.log('\n📦 Launching Chromium (Playwright)...');
    browserChromium = await chromium.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    });
    contextChromium = await browserChromium.newContext({
      permissions: ['camera', 'microphone'],
    });
    pageChromium = await contextChromium.newPage();
    
    // Launch Edge (real Microsoft Edge)
    console.log('📦 Launching Microsoft Edge (Playwright)...');
    try {
      // Try to find Edge executable
      const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
      browserEdge = await chromium.launch({
        headless: false,
        executablePath: edgePath,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
        ],
      });
    } catch (e) {
      console.log('⚠️  Edge not found at default path, trying alternative...');
      browserEdge = await chromium.launch({
        headless: false,
        channel: 'msedge',
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
        ],
      });
    }
    
    contextEdge = await browserEdge.newContext({
      permissions: ['camera', 'microphone'],
    });
    pageEdge = await contextEdge.newPage();
    
    // Console logging
    pageChromium.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') && (text.includes('✅') || text.includes('❌') || text.includes('Connection'))) {
        console.log('  [Chromium]', text);
      }
    });
    
    pageEdge.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') && (text.includes('✅') || text.includes('❌') || text.includes('Connection'))) {
        console.log('  [Edge]', text);
      }
    });
    
    // Generate unique room
    const roomId = `test-real-cross-browser-${Date.now()}`;
    const chromiumUrl = `${BASE_URL}/test-videolify?room=${roomId}&name=Chromium-User&role=tutor`;
    const edgeUrl = `${BASE_URL}/test-videolify?room=${roomId}&name=Edge-User&role=student`;
    
    console.log(`\n🔗 Room: ${roomId}`);
    
    // TEST 1: Chromium joins
    console.log('\n📝 Test 1: Chromium user joins');
    await pageChromium.goto(chromiumUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    
    const chromiumJoined = await pageChromium.evaluate(() => {
      return !document.body.innerText.includes('không hỗ trợ') && 
             !document.body.innerText.includes('Lỗi');
    });
    
    if (chromiumJoined) {
      console.log('✅ TEST 1 PASSED: Chromium joined');
    } else {
      console.log('❌ TEST 1 FAILED: Chromium failed to join');
      throw new Error('Chromium join failed');
    }
    
    // TEST 2: Edge joins
    console.log('\n📝 Test 2: Edge user joins');
    await pageEdge.goto(edgeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(5000);
    
    const edgeJoined = await pageEdge.evaluate(() => {
      return !document.body.innerText.includes('không hỗ trợ') && 
             !document.body.innerText.includes('Lỗi');
    });
    
    if (edgeJoined) {
      console.log('✅ TEST 2 PASSED: Edge joined');
    } else {
      console.log('❌ TEST 2 FAILED: Edge failed to join');
      throw new Error('Edge join failed');
    }
    
    // TEST 3: P2P Connection
    console.log('\n📝 Test 3: Verify P2P connection between Chromium and Edge');
    await sleep(10000);
    
    const chromiumConnected = await pageChromium.evaluate(() => {
      const videos = document.querySelectorAll('video');
      const text = document.body.innerText;
      return {
        videoCount: videos.length,
        connected: text.includes('Connected') || text.includes('Đã kết nối'),
      };
    });
    
    const edgeConnected = await pageEdge.evaluate(() => {
      const videos = document.querySelectorAll('video');
      const text = document.body.innerText;
      return {
        videoCount: videos.length,
        connected: text.includes('Connected') || text.includes('Đã kết nối'),
      };
    });
    
    console.log('  Chromium:', chromiumConnected);
    console.log('  Edge:', edgeConnected);
    
    if (chromiumConnected.connected && edgeConnected.connected) {
      console.log('✅ TEST 3 PASSED: P2P connection established!');
    } else {
      console.log('❌ TEST 3 FAILED: P2P connection not established');
      console.log('   This confirms your issue - cross-browser connection failed!');
    }
    
    // TEST 4: Stability
    console.log('\n📝 Test 4: Monitor connection (30s)');
    
    let stable = true;
    for (let i = 0; i < 6; i++) {
      await sleep(5000);
      
      const c = await pageChromium.evaluate(() => !document.body.innerText.includes('disconnected'));
      const e = await pageEdge.evaluate(() => !document.body.innerText.includes('disconnected'));
      
      console.log(`  Check ${i + 1}/6: Chromium=${c ? '✅' : '❌'}, Edge=${e ? '✅' : '❌'}`);
      
      if (!c || !e) {
        stable = false;
        break;
      }
    }
    
    if (stable) {
      console.log('✅ TEST 4 PASSED: Connection stable');
    } else {
      console.log('⚠️  TEST 4 FAILED: Connection dropped');
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST 23 COMPLETED: Real Cross-Browser Test');
    console.log('   - Chromium join: ' + (chromiumJoined ? '✅' : '❌'));
    console.log('   - Edge join: ' + (edgeJoined ? '✅' : '❌'));
    console.log('   - P2P connection: ' + (chromiumConnected.connected && edgeConnected.connected ? '✅' : '❌'));
    console.log('   - Stability: ' + (stable ? '✅' : '⚠️'));
    console.log('='.repeat(70));
    
    if (!chromiumConnected.connected || !edgeConnected.connected) {
      console.log('\n⚠️  CROSS-BROWSER ISSUE CONFIRMED!');
      console.log('Next steps to fix:');
      console.log('1. Check browser console for WebRTC errors');
      console.log('2. Verify ICE candidate generation');
      console.log('3. Check for browser-specific WebRTC implementation differences');
      console.log('4. May need TURN server for different browsers');
    }
    
    await sleep(5000);
    
  } catch (error) {
    console.error('\n❌ TEST 23 FAILED:', error.message);
    throw error;
  } finally {
    if (contextChromium) await contextChromium.close();
    if (contextEdge) await contextEdge.close();
    if (browserChromium) await browserChromium.close();
    if (browserEdge) await browserEdge.close();
  }
}

runTest()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
