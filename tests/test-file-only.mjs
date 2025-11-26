#!/usr/bin/env node
/**
 * SIMPLE FILE TRANSFER TEST
 * Focus: Progress sync + File transfer completion
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3001';
const ROOM = 'test-file-' + Date.now();

// Create small test file (100KB for fast test)
const TEST_FILE_PATH = join(process.cwd(), 'test-file-small.txt');
const TEST_FILE_SIZE = 100 * 1024; // 100KB
writeFileSync(TEST_FILE_PATH, 'A'.repeat(TEST_FILE_SIZE));

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n📁 FILE TRANSFER TEST');
console.log('='.repeat(60));
console.log(`Room: ${ROOM}`);
console.log(`File: ${(TEST_FILE_SIZE / 1024).toFixed(2)} KB`);
console.log('='.repeat(60));

let browser1, browser2, page1, page2;

try {
  console.log('\n[1/7] Launching browsers...');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  const context1 = await browser1.newContext({ permissions: ['camera', 'microphone'] });
  const context2 = await browser2.newContext({ permissions: ['camera', 'microphone'] });

  page1 = await context1.newPage();
  page2 = await context2.newPage();

  page1.setDefaultTimeout(30000);
  page2.setDefaultTimeout(30000);

  console.log('\n[2/7] Peer1 (Sender) joining...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Sender`);
  await sleep(3000);

  console.log('\n[3/7] Peer2 (Receiver) joining...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Receiver`);
  await sleep(3000);

  console.log('\n[4/7] Waiting for DataChannels to open (max 20s)...');

  const checkChannels = () => page1.evaluate(() => {
    const fileChannel = window.fileChannelRef?.current;
    return {
      exists: !!fileChannel,
      state: fileChannel?.readyState || 'not-created'
    };
  });

  let channelCheck = { state: 'not-created' };
  let waited = 0;
  const maxWait = 20000; // 20 seconds

  while (waited < maxWait) {
    channelCheck = await checkChannels();

    if (channelCheck.state === 'open') {
      console.log(`✅ File channel OPEN after ${waited / 1000}s`);
      break;
    }

    if (waited % 2000 === 0) { // Log every 2 seconds
      console.log(`⏳ File channel: ${channelCheck.state} (${waited / 1000}s)`);
    }

    await sleep(1000);
    waited += 1000;
  }

  if (channelCheck.state !== 'open') {
    throw new Error(`❌ File channel not open after ${maxWait / 1000}s! Final state: ${channelCheck.state}`);
  }

  console.log('\n[5/7] ✅ Channels ready! Sending file...');

  // Send file using exposed function
  const sendResult = await page1.evaluate(({ filePath, fileName }) => {
    return new Promise(async (resolve) => {
      try {
        // Fetch file content
        const response = await fetch(filePath);
        const buffer = await response.arrayBuffer();
        const file = new File([buffer], fileName, { type: 'text/plain' });

        // Call exposed sendFile function
        if (typeof window.sendFile === 'function') {
          window.sendFile(file);
          resolve({ success: true });
        } else {
          resolve({ success: false, error: 'sendFile not exposed' });
        }
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }, { filePath: `file://${TEST_FILE_PATH}`, fileName: 'test-file-small.txt' });

  console.log('Send file result:', sendResult);

  if (!sendResult.success) {
    throw new Error('Failed to send file: ' + sendResult.error);
  }

  await sleep(2000);

  console.log('\n[6/7] Receiver accepting file...');

  const acceptResult = await page2.evaluate(() => {
    return new Promise(async (resolve) => {
      try {
        // Suppress File System Access API dialog for test
        delete window.showSaveFilePicker;

        // Call exposed acceptFile function
        if (typeof window.acceptFile === 'function') {
          await window.acceptFile();
          resolve({ success: true });
        } else {
          resolve({ success: false, error: 'acceptFile not exposed' });
        }
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  });

  console.log('Accept result:', acceptResult);

  console.log('\n[7/7] Waiting for transfer to complete (max 20s)...');

  let complete = false;
  let lastProgress = 0;

  for (let i = 0; i < 20; i++) {
    await sleep(1000);

    // Check progress
    const progress = await page2.evaluate(() => {
      const incomingFile = document.__VIDEOLIFY_INCOMING_FILE__;
      return incomingFile?.progress || 0;
    });

    if (progress > lastProgress) {
      console.log(`📊 Progress: ${progress}%`);
      lastProgress = progress;
    }

    if (progress >= 100) {
      complete = true;
      break;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (complete) {
    console.log('✅ FILE TRANSFER COMPLETED!');
  } else {
    console.log('❌ Transfer timeout or incomplete');
  }
  console.log('='.repeat(60));

  console.log('\nKeeping browsers open for 5s...');
  await sleep(5000);

  await browser1.close();
  await browser2.close();

  process.exit(complete ? 0 : 1);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);

  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});

  process.exit(1);
}
