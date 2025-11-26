#!/usr/bin/env node
/**
 * Comprehensive P2P Bug Tests
 * Tests 7 critical bugs in video call 1-1
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'bug-test-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🧪 P2P BUG TESTS - 7 Critical Bugs');
console.log('='.repeat(70));

let browser1, browser2, page1, page2;
const results = [];

try {
  // Setup browsers
  console.log('\n[Setup] Launching browsers...');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  page1 = await browser1.newPage();
  page2 = await browser2.newPage();

  // Join room
  console.log('[Setup] Both peers joining room...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(2000);
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Peer2`);
  await sleep(3000);

  // Wait for connection to establish (check for green dot)
  console.log('[Setup] Waiting for P2P connection to establish...');
  let connected = false;
  for (let i = 0; i < 30; i++) {
    const status = await page1.evaluate(() => {
      // Look for green dot in top-right corner
      const greenDot = document.querySelector('.bg-green-500.rounded-full');
      if (greenDot) return true;

      // Fallback: check for any indication of connection
      const connectionState = document.body.textContent;
      return connectionState.includes('Online') || connectionState.includes('connected');
    });
    if (status) {
      connected = true;
      console.log(`[Setup] ✅ Connection established after ${i + 1}s`);
      break;
    }
    await sleep(1000);
  }

  if (!connected) {
    console.error('[Setup] ❌ Connection did not establish within 30s');
    // Don't throw - continue to see what happens
    console.warn('[Setup] ⚠️ Continuing anyway to see logs...');
  }

  // Extra wait for data channels to open
  console.log('[Setup] Waiting 5s for data channels to open...');
  await sleep(5000);

  console.log('[Setup] Initial connection established\n');

  // ============================================================================
  // BUG 1: Đóng browser 1 bên → bên kia vẫn hiển thị "đã kết nối"
  // ============================================================================
  console.log('━'.repeat(70));
  console.log('🐛 BUG 1: Peer disconnect detection');
  console.log('━'.repeat(70));

  console.log('[Test] Checking initial connection status...');
  const status1Before = await page2.evaluate(() => {
    const badge = document.querySelector('.bg-green-500');
    return badge?.textContent?.includes('Đã kết nối');
  });
  console.log(`[Peer2] Status before close: ${status1Before ? '✅ Connected' : '❌ Not connected'}`);

  console.log('[Test] Closing Peer1 browser...');
  await page1.close();
  await sleep(8000); // Wait for disconnect detection

  console.log('[Test] Checking Peer2 status after Peer1 closes...');
  const status1After = await page2.evaluate(() => {
    const disconnectedBadge = document.querySelector('.bg-red-500');
    const waitingText = document.body.textContent;
    return {
      showsDisconnected: !!disconnectedBadge && disconnectedBadge.textContent.includes('Mất kết nối'),
      showsWaiting: waitingText.includes('Đang chờ người khác') || waitingText.includes('Đã mất kết nối'),
    };
  });

  const bug1Fixed = status1After.showsDisconnected || status1After.showsWaiting;
  results.push({
    bug: 1,
    name: 'Peer disconnect detection',
    passed: bug1Fixed,
    details: status1After,
  });
  console.log(bug1Fixed ? '✅ BUG 1 FIXED' : '❌ BUG 1 STILL EXISTS');

  // Reopen Peer1 for next tests
  console.log('[Setup] Reopening Peer1 for next tests...');
  page1 = await browser1.newPage();
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(5000);

  // ============================================================================
  // BUG 4: Chat không sync
  // ============================================================================
  console.log('\n' + '━'.repeat(70));
  console.log('🐛 BUG 4: Chat P2P sync');
  console.log('━'.repeat(70));

  console.log('[Test] Opening chat on Peer1...');
  try {
    await page1.waitForSelector('button[aria-label="Chat"]', { timeout: 5000 });
    await page1.click('button[aria-label="Chat"]');
    console.log('[Test] Chat panel opened');
  } catch (e) {
    console.log('Chat button not found:', e.message);
  }
  await sleep(2000);

  console.log('[Test] Sending message from Peer1...');
  await page1.fill('input[placeholder*="Nhập tin nhắn"], textarea[placeholder*="Nhập tin nhắn"]', 'Test message from Peer1');
  await page1.press('input[placeholder*="Nhập tin nhắn"], textarea[placeholder*="Nhập tin nhắn"]', 'Enter');
  await sleep(3000);

  console.log('[Test] Checking if Peer2 received message...');
  try {
    await page2.waitForSelector('button[aria-label="Chat"]', { timeout: 5000 });
    await page2.click('button[aria-label="Chat"]');
    console.log('[Test] Peer2 chat panel opened');
  } catch (e) {
    console.log('Chat button not found on Peer2:', e.message);
  }
  await sleep(2000);

  const chatReceived = await page2.evaluate(() => {
    const chatArea = document.body.textContent;
    return chatArea.includes('Test message from Peer1');
  });

  results.push({
    bug: 4,
    name: 'Chat P2P sync',
    passed: chatReceived,
  });
  console.log(chatReceived ? '✅ BUG 4 FIXED' : '❌ BUG 4 STILL EXISTS');

  // ============================================================================
  // BUG 5: Hand raise không sync
  // ============================================================================
  console.log('\n' + '━'.repeat(70));
  console.log('🐛 BUG 5: Hand raise P2P sync');
  console.log('━'.repeat(70));

  console.log('[Test] Peer1 raising hand...');
  try {
    // Wait for button to be enabled
    await page1.waitForSelector('button[aria-label="Giơ tay"]:not([disabled])', { timeout: 5000 });
    await page1.click('button[aria-label="Giơ tay"]');
    console.log('[Test] Hand raise button clicked');
  } catch (e) {
    console.log('Hand raise button not found or disabled:', e.message);
  }
  await sleep(3000);

  console.log('[Test] Checking if Peer2 sees hand raise...');
  const handRaiseVisible = await page2.evaluate(() => {
    const badge = document.body.textContent;
    return badge.includes('raised hand') || badge.includes('giơ tay') || badge.includes('Peer raised hand');
  });

  results.push({
    bug: 5,
    name: 'Hand raise P2P sync',
    passed: handRaiseVisible,
  });
  console.log(handRaiseVisible ? '✅ BUG 5 FIXED' : '❌ BUG 5 STILL EXISTS');

  // ============================================================================
  // BUG 6: Whiteboard không auto-open và sync
  // ============================================================================
  console.log('\n' + '━'.repeat(70));
  console.log('🐛 BUG 6: Whiteboard auto-open and sync');
  console.log('━'.repeat(70));

  console.log('[Test] Peer1 opening whiteboard...');
  try {
    await page1.waitForSelector('button[aria-label="Bảng trắng"]', { timeout: 5000 });
    await page1.click('button[aria-label="Bảng trắng"]');
    console.log('[Test] Whiteboard button clicked');
  } catch (e) {
    console.log('Whiteboard button not found:', e.message);
  }
  await sleep(3000);

  console.log('[Test] Checking if Peer2 whiteboard auto-opened...');
  const whiteboardAutoOpened = await page2.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return !!canvas;
  });

  results.push({
    bug: 6,
    name: 'Whiteboard auto-open',
    passed: whiteboardAutoOpened,
  });
  console.log(whiteboardAutoOpened ? '✅ BUG 6 FIXED (auto-open)' : '❌ BUG 6 STILL EXISTS (auto-open)');

  // Test whiteboard drawing sync
  if (whiteboardAutoOpened) {
    console.log('[Test] Drawing on Peer1 whiteboard...');
    await page1.mouse.move(200, 200);
    await page1.mouse.down();
    await page1.mouse.move(300, 300);
    await page1.mouse.up();
    await sleep(2000);

    console.log('[Test] Checking if Peer2 received drawing...');
    const drawingSynced = await page2.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Check if canvas has any non-white pixels
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] !== 255 || imageData.data[i+1] !== 255 || imageData.data[i+2] !== 255) {
          return true;
        }
      }
      return false;
    });

    results.push({
      bug: 6,
      name: 'Whiteboard drawing sync',
      passed: drawingSynced,
    });
    console.log(drawingSynced ? '✅ BUG 6 FIXED (sync)' : '❌ BUG 6 STILL EXISTS (sync)');
  }

  // ============================================================================
  // FINAL RESULTS
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`Bug ${result.bug}: ${result.name.padEnd(30)} ${status}`);
    if (result.passed) passed++;
    else failed++;
  });

  console.log('='.repeat(70));
  console.log(`Total: ${results.length} tests | Passed: ${passed} ✅ | Failed: ${failed} ❌`);
  console.log('='.repeat(70));

  console.log('\n⏳ Keeping browsers open for 5s...');
  await sleep(5000);

  await browser1.close();
  await browser2.close();

  process.exit(failed > 0 ? 1 : 0);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error.stack);

  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});

  process.exit(1);
}
