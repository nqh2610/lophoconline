#!/usr/bin/env node
/**
 * Test thực sự xem data channels có nhận/gửi messages không
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'msgtest-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🧪 REAL MESSAGE TEST');
console.log('='.repeat(70));

let browser1, browser2, page1, page2;

try {
  console.log('[1] Launching browsers...');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  page1 = await browser1.newPage();
  page2 = await browser2.newPage();

  // Capture console logs
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
  await sleep(5000);

  console.log('\n[4] Waiting for data channels to open...');
  await sleep(5000);

  // Check if data channels are actually open
  console.log('\n[5] Checking data channel states...');

  const p1Channels = await page1.evaluate(() => {
    return {
      whiteboard: window.whiteboardChannelRef?.current?.readyState,
      chat: window.chatChannelRef?.current?.readyState,
      control: window.controlChannelRef?.current?.readyState,
    };
  });

  const p2Channels = await page2.evaluate(() => {
    return {
      whiteboard: window.whiteboardChannelRef?.current?.readyState,
      chat: window.chatChannelRef?.current?.readyState,
      control: window.controlChannelRef?.current?.readyState,
    };
  });

  console.log('Peer1 channels:', p1Channels);
  console.log('Peer2 channels:', p2Channels);

  // Try to send a control message manually
  console.log('\n[6] Manually sending test control message from Peer1...');
  await page1.evaluate(() => {
    const channel = window.controlChannelRef?.current;
    console.log('[Manual Test] Control channel:', channel);
    console.log('[Manual Test] Control channel state:', channel?.readyState);
    if (channel && channel.readyState === 'open') {
      const msg = JSON.stringify({ type: 'test', data: 'Hello from manual test!' });
      console.log('[Manual Test] Sending:', msg);
      channel.send(msg);
      console.log('[Manual Test] ✅ Message sent');
    } else {
      console.error('[Manual Test] ❌ Channel not open!');
    }
  });

  await sleep(2000);

  // Check if Peer2 received it
  console.log('\n[7] Checking if Peer2 received message...');
  const p2Received = logs2.some(log => log.includes('test') && log.includes('Hello from manual test'));
  console.log('Peer2 received test message:', p2Received ? '✅ YES' : '❌ NO');

  // Analyze logs
  console.log('\n' + '='.repeat(70));
  console.log('📊 LOG ANALYSIS');
  console.log('='.repeat(70));

  const p1DataChannelOpen = logs1.some(l => l.includes('DataChannel OPEN'));
  const p2DataChannelOpen = logs2.some(l => l.includes('DataChannel OPEN') || l.includes('Received data channel'));

  console.log('\nPeer1:');
  console.log('  Data channels opened:', p1DataChannelOpen ? '✅' : '❌');

  console.log('\nPeer2:');
  console.log('  Data channels received:', p2DataChannelOpen ? '✅' : '❌');

  console.log('\n⏳ Keeping browsers open for 60s for manual testing...');
  console.log('Try sending chat messages, raising hand, opening whiteboard manually');
  console.log('Press Ctrl+C to close');
  await sleep(60000);

  await browser1.close();
  await browser2.close();

  process.exit(p1DataChannelOpen && p2DataChannelOpen && p2Received ? 0 : 1);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error.stack);

  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});

  process.exit(1);
}
