#!/usr/bin/env node
/**
 * COMPREHENSIVE DEBUG TEST
 * Captures ALL logs để tìm vấn đề thực sự
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'debug-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🔍 COMPREHENSIVE DEBUG TEST');
console.log('='.repeat(70));

let browser1, browser2, page1, page2;

try {
  // Launch with permissions
  console.log('[1] Launching browsers with media permissions...');
  browser1 = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ]
  });

  browser2 = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ]
  });

  const context1 = await browser1.newContext({
    permissions: ['camera', 'microphone']
  });

  const context2 = await browser2.newContext({
    permissions: ['camera', 'microphone']
  });

  page1 = await context1.newPage();
  page2 = await context2.newPage();

  const logs = {
    peer1: [],
    peer2: [],
  };

  // Capture ALL console messages
  page1.on('console', msg => {
    const text = msg.text();
    logs.peer1.push({ time: Date.now(), text });
    console.log(`[Peer1] ${text}`);
  });

  page2.on('console', msg => {
    const text = msg.text();
    logs.peer2.push({ time: Date.now(), text });
    console.log(`[Peer2] ${text}`);
  });

  // Capture errors
  page1.on('pageerror', err => {
    console.error(`[Peer1] ❌ ERROR:`, err.message);
  });

  page2.on('pageerror', err => {
    console.error(`[Peer2] ❌ ERROR:`, err.message);
  });

  console.log('\n[2] Peer1 joining room...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(5000);

  console.log('\n[3] Peer2 joining room...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Peer2`);

  console.log('\n[4] Waiting 15 seconds for connection...');
  await sleep(15000);

  // Analyze logs
  console.log('\n' + '='.repeat(70));
  console.log('📊 LOG ANALYSIS');
  console.log('='.repeat(70));

  function analyzeLogs(peer, peerLogs) {
    console.log(`\n${peer}:`);

    const checks = {
      sseOpened: peerLogs.some(l => l.text.includes('SSE connection opened')),
      peerJoined: peerLogs.some(l => l.text.includes('Peer joined event')),
      creatingPeerConnection: peerLogs.some(l => l.text.includes('Creating peer connection')),
      setupDataChannels: peerLogs.some(l => l.text.includes('Setting up data channels')),
      onnegotiationneeded: peerLogs.some(l => l.text.includes('onnegotiationneeded fired')),
      creatingOffer: peerLogs.some(l => l.text.includes('Creating offer')),
      offerSent: peerLogs.some(l => l.text.includes('Offer sent')),
      receivedOffer: peerLogs.some(l => l.text.includes('Received offer')),
      creatingAnswer: peerLogs.some(l => l.text.includes('Creating answer')),
      answerSent: peerLogs.some(l => l.text.includes('Answer sent')),
      receivedAnswer: peerLogs.some(l => l.text.includes('Received answer')),
      iceComplete: peerLogs.some(l => l.text.includes('ICE gathering complete')),
      dataChannelOpen: peerLogs.some(l => l.text.includes('DataChannel OPEN')),
      dataChannelReceived: peerLogs.some(l => l.text.includes('Received data channel')),
      connectionConnected: peerLogs.some(l => l.text.includes('connectionState: connected')),
    };

    for (const [key, value] of Object.entries(checks)) {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    }

    // Find critical errors
    const errors = peerLogs.filter(l =>
      l.text.includes('ERROR') ||
      l.text.includes('Error') ||
      l.text.includes('failed') ||
      l.text.includes('Failed')
    );

    if (errors.length > 0) {
      console.log(`\n  ⚠️ ERRORS (${errors.length}):`);
      errors.forEach(e => {
        console.log(`    - ${e.text}`);
      });
    }

    return checks;
  }

  const peer1Checks = analyzeLogs('Peer1 (Offerer)', logs.peer1);
  const peer2Checks = analyzeLogs('Peer2 (Answerer)', logs.peer2);

  // Diagnosis
  console.log('\n' + '='.repeat(70));
  console.log('🔬 DIAGNOSIS');
  console.log('='.repeat(70));

  if (!peer1Checks.sseOpened || !peer2Checks.sseOpened) {
    console.log('❌ SSE CONNECTION FAILED!');
    console.log('   This is the root cause - without SSE, no signaling possible.');
    console.log('   Check if server is running and accepting SSE connections.');
  } else if (!peer1Checks.onnegotiationneeded) {
    console.log('❌ onnegotiationneeded NOT FIRING on Peer1!');
    console.log('   Data channels created but negotiation not triggered.');
    console.log('   Check onnegotiationneeded handler logic.');
  } else if (!peer1Checks.offerSent) {
    console.log('❌ OFFER NOT SENT!');
    console.log('   onnegotiationneeded fired but offer not sent.');
    console.log('   Check offer creation logic.');
  } else if (!peer2Checks.receivedOffer) {
    console.log('❌ OFFER NOT RECEIVED by Peer2!');
    console.log('   Server may not be forwarding offers via SSE.');
    console.log('   Check server /api/videolify/signal endpoint.');
  } else if (!peer2Checks.answerSent) {
    console.log('❌ ANSWER NOT CREATED/SENT!');
    console.log('   Peer2 received offer but failed to create answer.');
    console.log('   Check answer creation logic.');
  } else if (!peer1Checks.dataChannelOpen && !peer2Checks.dataChannelReceived) {
    console.log('❌ DATA CHANNELS NOT OPENING!');
    console.log('   Signaling complete but data channels not working.');
    console.log('   Check data channel creation and ondatachannel handler.');
  } else if (peer1Checks.dataChannelOpen || peer2Checks.dataChannelReceived) {
    console.log('✅ DATA CHANNELS WORKING!');
    console.log('   P2P connection established successfully.');
    console.log('   Chat/whiteboard/hand raise should work.');
  } else {
    console.log('⚠️ UNKNOWN ISSUE');
    console.log('   Check the logs above for details.');
  }

  console.log('\n' + '='.repeat(70));
  console.log('⏳ Keeping browsers open for manual inspection...');
  console.log('Press Ctrl+C to close');
  console.log('='.repeat(70));

  // Keep open for manual testing
  await sleep(300000); // 5 minutes

  await browser1.close();
  await browser2.close();
  process.exit(0);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error.stack);

  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});

  process.exit(1);
}
