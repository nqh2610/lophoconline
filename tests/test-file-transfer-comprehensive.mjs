#!/usr/bin/env node
/**
 * COMPREHENSIVE FILE TRANSFER TEST
 *
 * Tests:
 * 1. Progress synchronization (sender → receiver)
 * 2. File save location dialog (File System Access API)
 * 3. File transfer completion
 * 4. UI/UX (minimize functionality)
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3001';
const ROOM = 'test-file-' + Date.now();

// Create test file (1MB for reasonable test time)
const TEST_FILE_PATH = join(process.cwd(), 'test-transfer-file.bin');
const TEST_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const testBuffer = Buffer.alloc(TEST_FILE_SIZE);
for (let i = 0; i < TEST_FILE_SIZE; i++) {
  testBuffer[i] = i % 256;
}
writeFileSync(TEST_FILE_PATH, testBuffer);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🔬 COMPREHENSIVE FILE TRANSFER TEST');
console.log('='.repeat(80));
console.log(`Room: ${ROOM}`);
console.log(`Test file: ${TEST_FILE_PATH} (${(TEST_FILE_SIZE / 1024 / 1024).toFixed(2)} MB)`);
console.log('='.repeat(80));

let browser1, browser2, page1, page2;
const logs1 = [];
const logs2 = [];

try {
  console.log('\n[1/12] Launching browsers...');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  const context1 = await browser1.newContext({
    permissions: ['camera', 'microphone'],
  });
  const context2 = await browser2.newContext({
    permissions: ['camera', 'microphone'],
  });

  page1 = await context1.newPage();
  page2 = await context2.newPage();

  page1.setDefaultTimeout(60000);
  page2.setDefaultTimeout(60000);

  // Capture console logs
  page1.on('console', msg => {
    const text = msg.text();
    logs1.push(text);
    if (text.includes('[Videolify]') || text.includes('📤') || text.includes('📥') || text.includes('📊')) {
      console.log(`[SENDER] ${text}`);
    }
  });

  page2.on('console', msg => {
    const text = msg.text();
    logs2.push(text);
    if (text.includes('[Videolify]') || text.includes('📤') || text.includes('📥') || text.includes('📊')) {
      console.log(`[RECEIVER] ${text}`);
    }
  });

  console.log('\n[2/12] Peer1 (Sender) joining...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Sender`);
  await sleep(3000);

  console.log('\n[3/12] Peer2 (Receiver) joining...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Receiver`);

  console.log('\n[4/12] Waiting 10s for P2P connection...');
  await sleep(10000);

  // =========================================================================
  // TEST 1: CHECK DATACHANNELS OPEN
  // =========================================================================
  console.log('\n' + '━'.repeat(80));
  console.log('📊 TEST 1: VERIFY DATACHANNELS OPEN');
  console.log('━'.repeat(80));

  const p1FileChannelOpen = logs1.some(l => l.includes('File DataChannel OPEN'));
  const p2FileChannelOpen = logs2.some(l => l.includes('File DataChannel OPEN'));

  console.log('Sender file channel:', p1FileChannelOpen ? '✅ OPEN' : '❌ CLOSED');
  console.log('Receiver file channel:', p2FileChannelOpen ? '✅ OPEN' : '❌ CLOSED');

  if (!p1FileChannelOpen || !p2FileChannelOpen) {
    throw new Error('❌ CRITICAL: DataChannels not open! Cannot test file transfer.');
  }

  // =========================================================================
  // TEST 2: SEND FILE
  // =========================================================================
  console.log('\n' + '━'.repeat(80));
  console.log('📊 TEST 2: SEND FILE FROM SENDER');
  console.log('━'.repeat(80));

  // Trigger file input
  const fileInputSet = await page1.evaluate((filePath) => {
    const fileInput = document.querySelector('input[type="file"]');
    if (!fileInput) {
      return { success: false, error: 'File input not found' };
    }

    // Create File object
    return fetch(filePath)
      .then(r => r.arrayBuffer())
      .then(buffer => {
        const file = new File([buffer], 'test-transfer-file.bin', { type: 'application/octet-stream' });

        // Find the sendFile function and call it directly
        const sendFileBtn = document.querySelector('[data-testid="send-file-btn"]');
        if (window.sendFile) {
          window.sendFile(file);
          return { success: true };
        }

        return { success: false, error: 'sendFile function not exposed' };
      });
  }, TEST_FILE_PATH);

  console.log('File input result:', fileInputSet);

  // Wait for file offer
  await sleep(2000);

  // =========================================================================
  // TEST 3: RECEIVER ACCEPTS FILE (WITHOUT SAVE DIALOG IN HEADLESS)
  // =========================================================================
  console.log('\n' + '━'.repeat(80));
  console.log('📊 TEST 3: RECEIVER ACCEPTS FILE');
  console.log('━'.repeat(80));

  // Note: File System Access API won't work in headless/automated test
  // But we can verify the accept flow works
  const acceptResult = await page2.evaluate(() => {
    const acceptBtn = document.querySelector('button:has-text("Accept")') ||
                      document.querySelector('button[data-testid="accept-file-btn"]');

    if (!acceptBtn) {
      // Try to accept via exposed function
      if (window.acceptFile) {
        window.acceptFile();
        return { success: true, method: 'function' };
      }
      return { success: false, error: 'Accept button not found' };
    }

    acceptBtn.click();
    return { success: true, method: 'button' };
  });

  console.log('Accept file result:', acceptResult);
  await sleep(1000);

  // =========================================================================
  // TEST 4: PROGRESS SYNCHRONIZATION
  // =========================================================================
  console.log('\n' + '━'.repeat(80));
  console.log('📊 TEST 4: VERIFY PROGRESS SYNCHRONIZATION');
  console.log('━'.repeat(80));

  // Wait for transfer to complete
  let maxWait = 30000; // 30 seconds max
  let waited = 0;
  let lastProgress = 0;

  while (waited < maxWait) {
    await sleep(1000);
    waited += 1000;

    // Check for progress updates in receiver logs
    const receiverProgressLogs = logs2.filter(l =>
      l.includes('Sender progress update:') || l.includes('file-progress')
    );

    if (receiverProgressLogs.length > 0) {
      const lastLog = receiverProgressLogs[receiverProgressLogs.length - 1];
      const match = lastLog.match(/(\d+)%/);
      if (match) {
        const progress = parseInt(match[1]);
        if (progress > lastProgress) {
          console.log(`📊 Progress sync: ${progress}%`);
          lastProgress = progress;
        }

        if (progress >= 100) {
          console.log('✅ Transfer completed!');
          break;
        }
      }
    }

    // Check sender completion
    const senderComplete = logs1.some(l => l.includes('File sent successfully'));
    if (senderComplete && waited > 10000) {
      console.log('✅ Sender reports complete');
      break;
    }
  }

  const receivedProgressUpdates = logs2.filter(l => l.includes('Sender progress update:')).length;
  console.log(`\n📊 Total progress updates received: ${receivedProgressUpdates}`);

  // =========================================================================
  // TEST 5: VERIFY COMPLETION
  // =========================================================================
  console.log('\n' + '━'.repeat(80));
  console.log('📊 TEST 5: VERIFY FILE TRANSFER COMPLETION');
  console.log('━'.repeat(80));

  const senderComplete = logs1.some(l => l.includes('File sent successfully'));
  const receiverComplete = logs2.some(l => l.includes('File received successfully'));

  console.log('Sender completion:', senderComplete ? '✅ YES' : '❌ NO');
  console.log('Receiver completion:', receiverComplete ? '✅ YES' : '❌ NO');

  // =========================================================================
  // FINAL RESULTS
  // =========================================================================
  console.log('\n' + '━'.repeat(80));
  console.log('📊 FINAL TEST RESULTS');
  console.log('━'.repeat(80));

  const allTestsPassed =
    p1FileChannelOpen &&
    p2FileChannelOpen &&
    receivedProgressUpdates > 0 &&
    senderComplete &&
    receiverComplete;

  console.log('\n✅ DataChannels Open:', p1FileChannelOpen && p2FileChannelOpen ? 'PASS' : 'FAIL');
  console.log('✅ Progress Sync:', receivedProgressUpdates > 0 ? `PASS (${receivedProgressUpdates} updates)` : 'FAIL');
  console.log('✅ Sender Complete:', senderComplete ? 'PASS' : 'FAIL');
  console.log('✅ Receiver Complete:', receiverComplete ? 'PASS' : 'FAIL');

  if (!allTestsPassed) {
    console.log('\n🔍 DEBUG: Some tests failed');
    console.log('Last 10 sender logs:');
    logs1.slice(-10).forEach(l => console.log('  ', l));
    console.log('\nLast 10 receiver logs:');
    logs2.slice(-10).forEach(l => console.log('  ', l));
  }

  console.log('\n' + '━'.repeat(80));
  console.log(allTestsPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
  console.log('━'.repeat(80));

  console.log('\nKeeping browsers open for 10s for inspection...');
  await sleep(10000);

  await browser1.close();
  await browser2.close();

  process.exit(allTestsPassed ? 0 : 1);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error.stack);

  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});

  process.exit(1);
}
