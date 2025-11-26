#!/usr/bin/env node
/**
 * F5 Refresh Test - Auto test và fix khả năng F5 refresh
 * Test scenarios:
 * 1. One side F5 (Peer A refreshes)
 * 2. Both sides F5 (Both peers refresh)
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'f5-test-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForConnection(page, peerId) {
  console.log(`[${peerId}] Waiting for P2P connection...`);

  for (let i = 0; i < 40; i++) {
    const result = await page.evaluate((checkNum) => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') ||
                         document.querySelector('video:not([data-testid="local-video"])');
      const state = window.__VIDEOLIFY_TEST_STATE__ || {};

      return {
        connected: remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active,
        iceState: state.iceConnectionState,
        hasVideo: !!remoteVideo,
        checkNum
      };
    }, i);

    if (i % 5 === 0) {
      console.log(`[${peerId}] Check ${result.checkNum}: iceState=${result.iceState}, hasVideo=${result.hasVideo}`);
    }

    if (result.connected) {
      console.log(`✅ [${peerId}] Connected`);
      return true;
    }

    await sleep(1000);
  }

  const finalState = await page.evaluate(() => {
    const state = window.__VIDEOLIFY_TEST_STATE__ || {};
    return {
      iceState: state.iceConnectionState || 'unknown',
      sseConnected: state.sseConnected || false,
      peerCount: state.peerCount || 0,
    };
  });

  console.error(`❌ [${peerId}] Connection timeout. Final state:`, finalState);
  throw new Error(`[${peerId}] Failed to connect after 40s`);
}

console.log('\n🧪 F5 REFRESH TEST');
console.log('='.repeat(60));

try {
  // Launch browsers
  console.log('\n[1] Launching browsers...');
  const browser1 = await chromium.launch({ headless: false });
  const browser2 = await chromium.launch({ headless: false });

  const page1 = await browser1.newPage();
  const page2 = await browser2.newPage();

  // Enable console logging
  page1.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('ROOM_FULL') || text.includes('Videolify')) {
      console.log(`[Page1] ${text}`);
    }
  });
  page2.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('ROOM_FULL') || text.includes('Videolify')) {
      console.log(`[Page2] ${text}`);
    }
  });

  // Test 1: Initial connection
  console.log('\n[2] Test 1: Initial connection');
  console.log('─'.repeat(60));

  console.log('[PeerA] Joining room...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=PeerA`);
  await sleep(2000);

  console.log('[PeerB] Joining room...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=PeerB`);
  await sleep(3000);

  await waitForConnection(page1, 'A');
  await waitForConnection(page2, 'B');
  console.log('✅ Test 1 PASSED: Initial connection successful');

  // Test 2: One side F5 (Peer A refreshes)
  console.log('\n[3] Test 2: One side F5 (Peer A refreshes)');
  console.log('─'.repeat(60));

  console.log('[PeerA] Refreshing page (F5)...');
  await page1.reload({ waitUntil: 'domcontentloaded' });
  await sleep(5000);

  console.log('[PeerA] Waiting for reconnection after F5...');
  try {
    await waitForConnection(page1, 'A');
    await waitForConnection(page2, 'B');
    console.log('✅ Test 2 PASSED: Reconnected after one side F5');
  } catch (error) {
    console.error('❌ Test 2 FAILED:', error.message);

    // Get detailed state
    const stateA = await page1.evaluate(() => window.__VIDEOLIFY_TEST_STATE__ || {});
    const stateB = await page2.evaluate(() => window.__VIDEOLIFY_TEST_STATE__ || {});
    console.log('State A:', stateA);
    console.log('State B:', stateB);

    throw error;
  }

  // Test 3: Both sides F5
  console.log('\n[4] Test 3: Both sides F5 (sequential)');
  console.log('─'.repeat(60));

  console.log('[PeerA] Refreshing...');
  await page1.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);

  console.log('[PeerB] Refreshing...');
  await page2.reload({ waitUntil: 'domcontentloaded' });
  await sleep(5000);

  console.log('[Both] Waiting for reconnection after both F5...');
  try {
    await waitForConnection(page1, 'A');
    await waitForConnection(page2, 'B');
    console.log('✅ Test 3 PASSED: Reconnected after both sides F5');
  } catch (error) {
    console.error('❌ Test 3 FAILED:', error.message);
    throw error;
  }

  // Keep browsers open for inspection
  console.log('\n⏳ Keeping browsers open for 5s...');
  await sleep(5000);

  // Cleanup
  await browser1.close();
  await browser2.close();

  console.log('\n✅ ALL F5 TESTS PASSED\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ F5 TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}
