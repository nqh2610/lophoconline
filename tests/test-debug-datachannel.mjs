#!/usr/bin/env node
/**
 * DEBUG: Kiểm tra data channel có thực sự gửi/nhận messages không
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3001';
const ROOM = 'debugtest-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🔍 DEBUG DATA CHANNEL MESSAGING');
console.log('='.repeat(70));

let browser1, browser2, page1, page2;

try {
  console.log('[1] Launching browsers...\n');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  page1 = await browser1.newPage();
  page2 = await browser2.newPage();

  page1.setDefaultTimeout(60000);
  page2.setDefaultTimeout(60000);

  // Capture ALL console logs to debug
  const logs1 = [];
  const logs2 = [];

  page1.on('console', msg => {
    const text = msg.text();
    logs1.push(text);
    console.log(`[P1] ${text}`);
  });

  page2.on('console', msg => {
    const text = msg.text();
    logs2.push(text);
    console.log(`[P2] ${text}`);
  });

  console.log('[2] Peer1 joining...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(3000);

  console.log('[3] Peer2 joining...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Peer2`);

  console.log('[4] Waiting 15s for connection...\n');
  await sleep(15000);

  console.log('━'.repeat(70));
  console.log('📊 CHECKING DATA CHANNEL STATES');
  console.log('━'.repeat(70));

  // Check if channels opened
  const p1HasOpen = logs1.some(l => l.includes('Chat DataChannel OPEN'));
  const p2HasOpen = logs2.some(l => l.includes('Chat DataChannel OPEN'));

  console.log('Peer1 Chat Channel Opened:', p1HasOpen ? '✅' : '❌');
  console.log('Peer2 Chat Channel Opened:', p2HasOpen ? '✅' : '❌');

  if (!p1HasOpen || !p2HasOpen) {
    console.log('\n❌ Channels did not open - aborting test');
    await sleep(60000);
    await browser1.close();
    await browser2.close();
    process.exit(1);
  }

  console.log('\n━'.repeat(70));
  console.log('🧪 TEST: Sending message from Peer1');
  console.log('━'.repeat(70));

  // Inject direct send via data channel
  const sendResult = await page1.evaluate(() => {
    try {
      const channel = window.chatChannelRef?.current;
      if (!channel) return { success: false, error: 'chatChannelRef is null' };
      if (channel.readyState !== 'open') return { success: false, error: `Channel state: ${channel.readyState}` };

      const msg = JSON.stringify({
        userName: "Peer1",
        message: "AUTO TEST MESSAGE",
        timestamp: Date.now(),
        fromMe: true
      });

      channel.send(msg);
      return { success: true, state: channel.readyState };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  });

  console.log('Send result:', sendResult);

  console.log('\n[5] Waiting 3s for Peer2 to receive...\n');
  await sleep(3000);

  // Check if Peer2 received
  const p2Received = logs2.filter(l =>
    l.includes('Chat message received') ||
    l.includes('Control channel received') ||
    l.includes('AUTO TEST MESSAGE')
  );

  console.log('━'.repeat(70));
  console.log('📊 RESULTS');
  console.log('━'.repeat(70));
  console.log('Peer1 sent message:', sendResult.success ? '✅' : '❌');
  console.log('Peer2 received logs:', p2Received.length);

  if (p2Received.length > 0) {
    console.log('\n✅ MESSAGE RECEIVED BY PEER2:');
    p2Received.forEach(log => console.log('  ', log));
  } else {
    console.log('\n❌ NO MESSAGE RECEIVED BY PEER2');
    console.log('\n🔍 Last 20 logs from Peer2:');
    logs2.slice(-20).forEach(log => console.log('  ', log));
  }

  console.log('\n━'.repeat(70));
  console.log('Keeping browsers open for 60s for manual inspection...');
  console.log('━'.repeat(70));
  await sleep(60000);

  await browser1.close();
  await browser2.close();

  process.exit(p2Received.length > 0 ? 0 : 1);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});
  process.exit(1);
}
