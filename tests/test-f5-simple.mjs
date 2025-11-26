#!/usr/bin/env node
/**
 * Simple F5 Refresh Test using Puppeteer
 * Tests one side F5 refresh
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'f5-simple-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForConnection(page, peerId, timeout = 40000) {
  console.log(`[${peerId}] Waiting for P2P connection (${timeout/1000}s timeout)...`);

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const connected = await page.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') ||
                         document.querySelector('video:not([data-testid="local-video"])');
      return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
    });

    if (connected) {
      console.log(`✅ [${peerId}] Connected in ${Date.now() - startTime}ms`);
      return true;
    }

    await sleep(1000);
  }

  console.error(`❌ [${peerId}] Connection timeout after ${timeout}ms`);
  return false;
}

console.log('\n🧪 F5 REFRESH TEST (Simple - Puppeteer)');
console.log('='.repeat(60));

let browserA, browserB, pageA, pageB;

try {
  // Launch browsers
  console.log('\n[Step 1] Launching browsers...');
  browserA = await puppeteer.launch({
    headless: false,
    slowMo: 30,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  browserB = await puppeteer.launch({
    headless: false,
    slowMo: 30,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  pageA = await browserA.newPage();
  pageB = await browserB.newPage();

  // Enable console logging
  pageA.on('console', msg => {
    const text = msg.text();
    if (text.includes('Videolify') || text.includes('ERROR') || text.includes('ROOM')) {
      console.log(`[PageA] ${text}`);
    }
  });
  pageB.on('console', msg => {
    const text = msg.text();
    if (text.includes('Videolify') || text.includes('ERROR') || text.includes('ROOM')) {
      console.log(`[PageB] ${text}`);
    }
  });

  // Test initial connection
  console.log('\n[Step 2] Initial connection test');
  console.log('─'.repeat(60));

  console.log('[PeerA] Joining room...');
  await pageA.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=PeerA`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);

  console.log('[PeerB] Joining room...');
  await pageB.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=PeerB`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(3000);

  const connectedA = await waitForConnection(pageA, 'A');
  const connectedB = await waitForConnection(pageB, 'B');

  if (!connectedA || !connectedB) {
    throw new Error('Initial connection failed');
  }

  console.log('✅ Initial connection successful\n');

  // Test F5 refresh
  console.log('\n[Step 3] F5 Refresh Test (Peer A refreshes)');
  console.log('─'.repeat(60));

  console.log('[PeerA] Refreshing page (F5)...');
  await pageA.reload({ waitUntil: 'domcontentloaded' });
  console.log('[PeerA] Page reloaded');
  await sleep(5000);

  console.log('[PeerA] Waiting for reconnection...');
  const reconnectedA = await waitForConnection(pageA, 'A', 30000);
  const stillConnectedB = await waitForConnection(pageB, 'B', 10000);

  if (!reconnectedA) {
    console.error('❌ FAILED: Peer A did not reconnect after F5');
    throw new Error('F5 reconnection failed for Peer A');
  }

  if (!stillConnectedB) {
    console.error('❌ FAILED: Peer B lost connection after Peer A F5');
    throw new Error('F5 caused Peer B to disconnect');
  }

  console.log('✅ F5 REFRESH TEST PASSED!\n');
  console.log('✅ Peer A reconnected successfully after F5');
  console.log('✅ Peer B maintained connection');

  // Keep browsers open for inspection
  console.log('\n⏳ Keeping browsers open for 5s for inspection...');
  await sleep(5000);

  await browserA.close();
  await browserB.close();

  console.log('\n✅ ALL TESTS PASSED\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ F5 TEST FAILED:', error.message);
  console.error(error.stack);

  if (browserA) await browserA.close().catch(() => {});
  if (browserB) await browserB.close().catch(() => {});

  process.exit(1);
}
