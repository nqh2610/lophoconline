#!/usr/bin/env node
/**
 * TEST THỰC SỰ: Gửi chat message và kiểm tra peer kia nhận được
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3001';
const ROOM = 'msgtest-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🧪 REAL MESSAGING TEST - SEND & RECEIVE');
console.log('='.repeat(70));

let browser1, browser2, page1, page2;

try {
  console.log('[1] Launching browsers...\n');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  page1 = await browser1.newPage();
  page2 = await browser2.newPage();

  // Increase timeout for slow compilation
  page1.setDefaultTimeout(60000);
  page2.setDefaultTimeout(60000);

  // Capture ONLY critical logs
  const criticalLogs1 = [];
  const criticalLogs2 = [];

  page1.on('console', msg => {
    const text = msg.text();
    if (text.includes('DataChannel OPEN') ||
        text.includes('Chat message') ||
        text.includes('Control message') ||
        text.includes('Whiteboard event') ||
        text.includes('onnegotiationneeded') ||
        text.includes('connectionState: connected')) {
      criticalLogs1.push(text);
      console.log(`[P1] ${text}`);
    }
  });

  page2.on('console', msg => {
    const text = msg.text();
    if (text.includes('DataChannel OPEN') ||
        text.includes('Chat message') ||
        text.includes('Control message') ||
        text.includes('Whiteboard event') ||
        text.includes('onnegotiationneeded') ||
        text.includes('connectionState: connected')) {
      criticalLogs2.push(text);
      console.log(`[P2] ${text}`);
    }
  });

  console.log('[2] Peer1 joining room...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(3000);

  console.log('[3] Peer2 joining room...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Peer2`);

  console.log('[4] Waiting 10s for P2P connection...\n');
  await sleep(10000);

  // Check data channel states
  console.log('━'.repeat(70));
  console.log('📊 DATA CHANNEL STATES');
  console.log('━'.repeat(70));

  const p1Channels = await page1.evaluate(() => {
    return {
      control: window.controlChannelRef?.current?.readyState,
      chat: window.chatChannelRef?.current?.readyState,
      whiteboard: window.whiteboardChannelRef?.current?.readyState,
    };
  });

  const p2Channels = await page2.evaluate(() => {
    return {
      control: window.controlChannelRef?.current?.readyState,
      chat: window.chatChannelRef?.current?.readyState,
      whiteboard: window.whiteboardChannelRef?.current?.readyState,
    };
  });

  console.log('Peer1:', p1Channels);
  console.log('Peer2:', p2Channels);

  const allOpen =
    p1Channels.control === 'open' &&
    p1Channels.chat === 'open' &&
    p2Channels.control === 'open' &&
    p2Channels.chat === 'open';

  if (!allOpen) {
    console.log('\n❌ DATA CHANNELS NOT OPEN - Cannot test messaging');
    console.log('   Need to fix data channel opening first!');

    console.log('\n📋 Peer1 Critical Logs:');
    criticalLogs1.forEach(log => console.log('   ', log));

    console.log('\n📋 Peer2 Critical Logs:');
    criticalLogs2.forEach(log => console.log('   ', log));

    await sleep(60000);
    await browser1.close();
    await browser2.close();
    process.exit(1);
  }

  console.log('\n✅ All data channels OPEN!\n');

  // TEST 1: CHAT MESSAGE
  console.log('━'.repeat(70));
  console.log('🧪 TEST 1: CHAT MESSAGE P2P');
  console.log('━'.repeat(70));

  console.log('[5] Opening chat on Peer1...');
  await page1.click('button[aria-label="Mở chat"]');
  await sleep(1000);

  console.log('[6] Typing message in Peer1...');
  await page1.fill('input[placeholder*="Nhập tin nhắn"]', 'Hello from Peer1!');
  await sleep(500);

  console.log('[7] Sending message...');
  await page1.press('input[placeholder*="Nhập tin nhắn"]', 'Enter');

  console.log('[8] Waiting 2s for Peer2 to receive...\n');
  await sleep(2000);

  // Check if Peer2 received
  const p2ChatMessages = await page2.evaluate(() => {
    const messages = Array.from(document.querySelectorAll('[class*="chat"] [class*="message"]'));
    return messages.map(m => m.textContent);
  });

  console.log('Peer2 chat messages:', p2ChatMessages);

  const chatWorking = p2ChatMessages.some(m => m && m.includes('Hello from Peer1'));
  console.log(chatWorking ? '✅ CHAT WORKING!' : '❌ CHAT NOT WORKING!');

  // TEST 2: HAND RAISE
  console.log('\n' + '━'.repeat(70));
  console.log('🧪 TEST 2: HAND RAISE P2P');
  console.log('━'.repeat(70));

  console.log('[9] Peer1 raising hand...');
  await page1.click('button[aria-label="Giơ tay"]');

  console.log('[10] Waiting 2s for Peer2 to see...\n');
  await sleep(2000);

  const p2SeesHandRaise = await page2.evaluate(() => {
    const badge = document.querySelector('[class*="badge"]');
    return badge?.textContent?.includes('Giơ tay') || badge?.textContent?.includes('raised hand');
  });

  console.log(p2SeesHandRaise ? '✅ HAND RAISE WORKING!' : '❌ HAND RAISE NOT WORKING!');

  // TEST 3: WHITEBOARD AUTO-OPEN
  console.log('\n' + '━'.repeat(70));
  console.log('🧪 TEST 3: WHITEBOARD AUTO-OPEN');
  console.log('━'.repeat(70));

  console.log('[11] Peer1 opening whiteboard...');
  await page1.click('button[aria-label="Bảng trắng"]');

  console.log('[12] Waiting 2s for Peer2 whiteboard to auto-open...\n');
  await sleep(2000);

  const p2WhiteboardOpen = await page2.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas && canvas.offsetParent !== null;
  });

  console.log(p2WhiteboardOpen ? '✅ WHITEBOARD AUTO-OPEN WORKING!' : '❌ WHITEBOARD AUTO-OPEN NOT WORKING!');

  // RESULTS
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(70));
  console.log('Chat P2P:', chatWorking ? '✅ PASS' : '❌ FAIL');
  console.log('Hand Raise P2P:', p2SeesHandRaise ? '✅ PASS' : '❌ FAIL');
  console.log('Whiteboard Auto-open:', p2WhiteboardOpen ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(70));

  if (chatWorking && p2SeesHandRaise && p2WhiteboardOpen) {
    console.log('\n🎉 ALL TESTS PASSED!');
    await sleep(5000);
    await browser1.close();
    await browser2.close();
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED - Keeping browsers open for debug...');
    await sleep(120000);
    await browser1.close();
    await browser2.close();
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});
  process.exit(1);
}
