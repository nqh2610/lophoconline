#!/usr/bin/env node
/**
 * Comprehensive Console Log Debug Test
 * Captures ALL browser console logs to debug data channels
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'debug-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🔍 CONSOLE LOG DEBUG TEST');
console.log('='.repeat(70));

let browser1, browser2, page1, page2;

try {
  console.log('\n[1] Launching browsers...');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  page1 = await browser1.newPage();
  page2 = await browser2.newPage();

  // Capture ALL console messages
  const logs = {
    peer1: [],
    peer2: [],
  };

  page1.on('console', msg => {
    const text = msg.text();
    logs.peer1.push(text);
    console.log(`[Peer1] ${text}`);
  });

  page2.on('console', msg => {
    const text = msg.text();
    logs.peer2.push(text);
    console.log(`[Peer2] ${text}`);
  });

  // Capture errors
  page1.on('pageerror', err => {
    console.error(`[Peer1] ❌ Page Error:`, err.message);
  });

  page2.on('pageerror', err => {
    console.error(`[Peer2] ❌ Page Error:`, err.message);
  });

  console.log('\n[2] Peer1 joining room...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(3000);

  console.log('\n[3] Peer2 joining room...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Peer2`);

  console.log('\n[4] Waiting 10 seconds to observe connection...');
  await sleep(10000);

  // Check for key logs
  console.log('\n' + '='.repeat(70));
  console.log('📊 LOG ANALYSIS');
  console.log('='.repeat(70));

  const checkLogs = (peer, peerLogs) => {
    console.log(`\n${peer} Key Events:`);

    const hasNegotiationNeeded = peerLogs.some(log => log.includes('onnegotiationneeded fired'));
    const hasDataChannelSetup = peerLogs.some(log => log.includes('Creating data channels'));
    const hasDataChannelOpen = peerLogs.some(log => log.includes('DataChannel OPEN'));
    const hasDataChannelReceived = peerLogs.some(log => log.includes('Received data channel'));
    const hasOfferSent = peerLogs.some(log => log.includes('Offer sent'));
    const hasAnswerSent = peerLogs.some(log => log.includes('Answer sent'));

    console.log(`  onnegotiationneeded fired: ${hasNegotiationNeeded ? '✅' : '❌'}`);
    console.log(`  Data channels created: ${hasDataChannelSetup ? '✅' : '❌'}`);
    console.log(`  Data channel OPEN: ${hasDataChannelOpen ? '✅' : '❌'}`);
    console.log(`  Data channel received: ${hasDataChannelReceived ? '✅' : '❌'}`);
    console.log(`  Offer sent: ${hasOfferSent ? '✅' : '❌'}`);
    console.log(`  Answer sent: ${hasAnswerSent ? '✅' : '❌'}`);

    return {
      hasNegotiationNeeded,
      hasDataChannelSetup,
      hasDataChannelOpen,
      hasDataChannelReceived,
      hasOfferSent,
      hasAnswerSent,
    };
  };

  const peer1Status = checkLogs('Peer1 (Offerer)', logs.peer1);
  const peer2Status = checkLogs('Peer2 (Answerer)', logs.peer2);

  // Final verdict
  console.log('\n' + '='.repeat(70));
  console.log('📋 VERDICT');
  console.log('='.repeat(70));

  const dataChannelsWorking =
    peer1Status.hasDataChannelOpen &&
    peer2Status.hasDataChannelReceived;

  if (dataChannelsWorking) {
    console.log('✅ Data channels are WORKING!');
  } else {
    console.log('❌ Data channels are NOT working!');
    console.log('\nLikely issues:');

    if (!peer1Status.hasNegotiationNeeded) {
      console.log('  - onnegotiationneeded not firing on Peer1 (offerer)');
    }

    if (!peer1Status.hasDataChannelSetup) {
      console.log('  - Data channels not being created on Peer1');
    }

    if (!peer1Status.hasDataChannelOpen) {
      console.log('  - Data channels not opening on Peer1');
    }

    if (!peer2Status.hasDataChannelReceived) {
      console.log('  - Data channels not received by Peer2 (answerer)');
      console.log('  - This means SDP offer likely does NOT include data channels!');
    }
  }

  console.log('\n⏳ Keeping browsers open for 60s for manual inspection...');
  await sleep(60000);

  await browser1.close();
  await browser2.close();

  process.exit(dataChannelsWorking ? 0 : 1);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error.stack);

  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});

  process.exit(1);
}
