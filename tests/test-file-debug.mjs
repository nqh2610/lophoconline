#!/usr/bin/env node
/**
 * FILE TRANSFER DEBUG TEST
 * Diagnose why DataChannels stuck in "connecting"
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3001';
const ROOM = 'test-debug-' + Date.now();

// Create small test file
const TEST_FILE_PATH = join(process.cwd(), 'test-debug-file.txt');
writeFileSync(TEST_FILE_PATH, 'A'.repeat(50 * 1024)); // 50KB

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🔍 FILE TRANSFER DEBUG TEST');
console.log('='.repeat(60));
console.log(`Room: ${ROOM}`);
console.log('='.repeat(60));

let browser1, browser2, page1, page2;

try {
  console.log('\n[1/8] Launching browsers...');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  const context1 = await browser1.newContext({ permissions: ['camera', 'microphone'] });
  const context2 = await browser2.newContext({ permissions: ['camera', 'microphone'] });

  page1 = await context1.newPage();
  page2 = await context2.newPage();

  // Capture ALL console logs
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

  console.log('\n[2/8] Peer1 joining...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(3000);

  console.log('\n[3/8] Peer2 joining...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Peer2`);

  console.log('\n[4/8] Waiting 12s for full P2P connection...');
  await sleep(12000);

  // Check connection status
  console.log('\n[5/8] Checking P2P connection status...');

  const p1State = await page1.evaluate(() => {
    const pc = window.peerConnections ? Object.values(window.peerConnections)[0] : null;
    const fileChannel = window.fileChannelRef?.current;

    return {
      pcExists: !!pc,
      pcState: pc?.connectionState || 'no-peer-connection',
      iceState: pc?.iceConnectionState || 'no-peer-connection',
      fileChannelExists: !!fileChannel,
      fileChannelState: fileChannel?.readyState || 'not-created',
    };
  });

  const p2State = await page2.evaluate(() => {
    const pc = window.peerConnections ? Object.values(window.peerConnections)[0] : null;
    const fileChannel = window.fileChannelRef?.current;

    return {
      pcExists: !!pc,
      pcState: pc?.connectionState || 'no-peer-connection',
      iceState: pc?.iceConnectionState || 'no-peer-connection',
      fileChannelExists: !!fileChannel,
      fileChannelState: fileChannel?.readyState || 'not-created',
    };
  });

  console.log('\n📊 Peer1 Status:');
  console.log('  PeerConnection:', p1State.pcExists ? '✅ EXISTS' : '❌ NOT CREATED');
  console.log('  PC State:', p1State.pcState);
  console.log('  ICE State:', p1State.iceState);
  console.log('  File Channel:', p1State.fileChannelExists ? '✅ EXISTS' : '❌ NOT CREATED');
  console.log('  File Channel State:', p1State.fileChannelState);

  console.log('\n📊 Peer2 Status:');
  console.log('  PeerConnection:', p2State.pcExists ? '✅ EXISTS' : '❌ NOT CREATED');
  console.log('  PC State:', p2State.pcState);
  console.log('  ICE State:', p2State.iceState);
  console.log('  File Channel:', p2State.fileChannelExists ? '✅ EXISTS' : '❌ NOT CREATED');
  console.log('  File Channel State:', p2State.fileChannelState);

  // Check for specific log patterns
  console.log('\n[6/8] Analyzing console logs...');

  const p1HasStrictModeSkip = logs1.some(l => l.includes('Skipping cleanup - React StrictMode'));
  const p1HasSSESkipDuplicate = logs1.some(l => l.includes('SSE already connected'));
  const p1ExistingPeers = logs1.find(l => l.includes('Received') && l.includes('existing peers'));

  const p2HasStrictModeSkip = logs2.some(l => l.includes('Skipping cleanup - React StrictMode'));
  const p2HasSSESkipDuplicate = logs2.some(l => l.includes('SSE already connected'));
  const p2ExistingPeers = logs2.find(l => l.includes('Received') && l.includes('existing peers'));

  console.log('\nPeer1 Logs:');
  console.log('  StrictMode skip:', p1HasStrictModeSkip ? '✅ YES' : '❌ NO');
  console.log('  SSE duplicate skip:', p1HasSSESkipDuplicate ? '✅ YES' : '❌ NO');
  console.log('  Existing peers:', p1ExistingPeers || '❓ NOT FOUND');

  console.log('\nPeer2 Logs:');
  console.log('  StrictMode skip:', p2HasStrictModeSkip ? '✅ YES' : '❌ NO');
  console.log('  SSE duplicate skip:', p2HasSSESkipDuplicate ? '✅ YES' : '❌ NO');
  console.log('  Existing peers:', p2ExistingPeers || '❓ NOT FOUND');

  // Check for DataChannel open logs
  const p1FileChannelOpen = logs1.some(l => l.includes('File DataChannel OPEN'));
  const p2FileChannelOpen = logs2.some(l => l.includes('File DataChannel OPEN'));

  console.log('\nDataChannel Open Events:');
  console.log('  Peer1 file channel open:', p1FileChannelOpen ? '✅ YES' : '❌ NO');
  console.log('  Peer2 file channel open:', p2FileChannelOpen ? '✅ YES' : '❌ NO');

  // Try to send file if channels are open
  if (p1State.fileChannelState === 'open' && p2State.fileChannelState === 'open') {
    console.log('\n[7/8] ✅ Channels OPEN! Attempting file send...');

    const sendResult = await page1.evaluate(({ filePath, fileName }) => {
      return new Promise(async (resolve) => {
        try {
          const response = await fetch(filePath);
          const buffer = await response.arrayBuffer();
          const file = new File([buffer], fileName, { type: 'text/plain' });

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
    }, { filePath: `file://${TEST_FILE_PATH}`, fileName: 'test-debug-file.txt' });

    console.log('Send result:', sendResult);
  } else {
    console.log('\n[7/8] ❌ Channels NOT OPEN - cannot test file send');
    console.log('\nDIAGNOSIS:');

    if (!p1State.pcExists || !p2State.pcExists) {
      console.log('  ⚠️  ISSUE: PeerConnection not created');
      console.log('  💡 FIX: Check if SSE connection is working, check server logs');
    } else if (p1State.pcState !== 'connected' || p2State.pcState !== 'connected') {
      console.log('  ⚠️  ISSUE: PeerConnection not in connected state');
      console.log('  💡 FIX: Check ICE configuration, STUN/TURN servers');
    } else if (!p1State.fileChannelExists || !p2State.fileChannelExists) {
      console.log('  ⚠️  ISSUE: DataChannels not created');
      console.log('  💡 FIX: Check setupDataChannels() is being called');
    } else if (p1State.fileChannelState !== 'open' || p2State.fileChannelState !== 'open') {
      console.log('  ⚠️  ISSUE: DataChannels stuck in:', p1State.fileChannelState, '/', p2State.fileChannelState);
      console.log('  💡 FIX: Wait longer or check perfect negotiation implementation');
    }
  }

  console.log('\n[8/8] Keeping browsers open for 10s for inspection...');
  await sleep(10000);

  await browser1.close();
  await browser2.close();

  const success = p1State.fileChannelState === 'open' && p2State.fileChannelState === 'open';
  console.log('\n' + '='.repeat(60));
  console.log(success ? '✅ TEST PASSED - Channels OPEN' : '❌ TEST FAILED - Channels NOT OPEN');
  console.log('='.repeat(60));

  process.exit(success ? 0 : 1);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error.stack);

  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});

  process.exit(1);
}
