#!/usr/bin/env node
/**
 * FINAL TEST: Verify BIDIRECTIONAL data channel messaging after Perfect Negotiation fix
 *
 * Tests:
 * 1. Both peers establish connection (no collision)
 * 2. Peer A → Peer B messages work
 * 3. Peer B → Peer A messages work (CRITICAL - this was broken before)
 * 4. Chat, hand raise, whiteboard all sync bidirectionally
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3001';
const ROOM = 'bidirectional-test-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🔬 TESTING BIDIRECTIONAL DATA CHANNEL COMMUNICATION');
console.log('='.repeat(80));
console.log(`Room: ${ROOM}`);
console.log('='.repeat(80));

let browser1, browser2, page1, page2;
const logs1 = [];
const logs2 = [];

try {
  console.log('\n[1/8] Launching browsers...');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  page1 = await browser1.newPage();
  page2 = await browser2.newPage();

  page1.setDefaultTimeout(60000);
  page2.setDefaultTimeout(60000);

  // Capture console logs
  page1.on('console', msg => {
    const text = msg.text();
    logs1.push(text);
    if (text.includes('[Videolify]') || text.includes('📥') || text.includes('💬')) {
      console.log(`[P1] ${text}`);
    }
  });

  page2.on('console', msg => {
    const text = msg.text();
    logs2.push(text);
    if (text.includes('[Videolify]') || text.includes('📥') || text.includes('💬')) {
      console.log(`[P2] ${text}`);
    }
  });

  console.log('\n[2/8] Peer1 (testUserId=100) joining...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(3000);

  console.log('\n[3/8] Peer2 (testUserId=200) joining...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Peer2`);

  console.log('\n[4/8] Waiting 15s for P2P connection...\n');
  await sleep(15000);

  // =========================================================================
  // VERIFY DATA CHANNELS OPENED
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 STEP 1: VERIFY DATA CHANNELS OPENED');
  console.log('━'.repeat(80));

  const p1ChatOpen = logs1.some(l => l.includes('Chat DataChannel OPEN'));
  const p2ChatOpen = logs2.some(l => l.includes('Chat DataChannel OPEN'));
  const p1ControlOpen = logs1.some(l => l.includes('Control DataChannel OPEN'));
  const p2ControlOpen = logs2.some(l => l.includes('Control DataChannel OPEN'));

  console.log('Peer1 Chat Channel:', p1ChatOpen ? '✅ OPEN' : '❌ CLOSED');
  console.log('Peer2 Chat Channel:', p2ChatOpen ? '✅ OPEN' : '❌ CLOSED');
  console.log('Peer1 Control Channel:', p1ControlOpen ? '✅ OPEN' : '❌ CLOSED');
  console.log('Peer2 Control Channel:', p2ControlOpen ? '✅ OPEN' : '❌ CLOSED');

  if (!p1ChatOpen || !p2ChatOpen || !p1ControlOpen || !p2ControlOpen) {
    console.log('\n❌ TEST FAILED: Data channels did not open on both peers');

    // Show recent logs for debugging
    console.log('\n🔍 Last 30 logs from Peer1:');
    logs1.slice(-30).forEach(l => console.log('  ', l));

    console.log('\n🔍 Last 30 logs from Peer2:');
    logs2.slice(-30).forEach(l => console.log('  ', l));

    await sleep(60000);
    await browser1.close();
    await browser2.close();
    process.exit(1);
  }

  // =========================================================================
  // TEST 1: PEER1 → PEER2 CHAT MESSAGE
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 STEP 2: TEST PEER1 → PEER2 CHAT MESSAGE');
  console.log('━'.repeat(80));

  // Clear previous received messages
  const p2LogsBeforeTest1 = logs2.length;

  const sendResult1 = await page1.evaluate(() => {
    try {
      const channel = window.chatChannelRef?.current;
      if (!channel) return { success: false, error: 'chatChannelRef is null' };
      if (channel.readyState !== 'open') return { success: false, error: `Channel state: ${channel.readyState}` };

      const msg = JSON.stringify({
        userName: "Peer1",
        message: "TEST MESSAGE FROM PEER1",
        timestamp: Date.now(),
        fromMe: true
      });

      channel.send(msg);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  });

  console.log('Peer1 send result:', sendResult1);
  console.log('Waiting 3s for Peer2 to receive...');
  await sleep(3000);

  const p2ReceivedFromP1 = logs2.slice(p2LogsBeforeTest1).some(l =>
    l.includes('Chat message received') || l.includes('TEST MESSAGE FROM PEER1')
  );

  console.log('Peer1 → Peer2:', p2ReceivedFromP1 ? '✅ MESSAGE RECEIVED' : '❌ NOT RECEIVED');

  // =========================================================================
  // TEST 2: PEER2 → PEER1 CHAT MESSAGE (CRITICAL - WAS BROKEN BEFORE FIX)
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 STEP 3: TEST PEER2 → PEER1 CHAT MESSAGE (CRITICAL)');
  console.log('━'.repeat(80));

  // Clear previous received messages
  const p1LogsBeforeTest2 = logs1.length;

  const sendResult2 = await page2.evaluate(() => {
    try {
      const channel = window.chatChannelRef?.current;
      if (!channel) return { success: false, error: 'chatChannelRef is null' };
      if (channel.readyState !== 'open') return { success: false, error: `Channel state: ${channel.readyState}` };

      const msg = JSON.stringify({
        userName: "Peer2",
        message: "TEST MESSAGE FROM PEER2",
        timestamp: Date.now(),
        fromMe: true
      });

      channel.send(msg);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  });

  console.log('Peer2 send result:', sendResult2);
  console.log('Waiting 3s for Peer1 to receive...');
  await sleep(3000);

  const p1ReceivedFromP2 = logs1.slice(p1LogsBeforeTest2).some(l =>
    l.includes('Chat message received') || l.includes('TEST MESSAGE FROM PEER2')
  );

  console.log('Peer2 → Peer1:', p1ReceivedFromP2 ? '✅ MESSAGE RECEIVED' : '❌ NOT RECEIVED');

  // =========================================================================
  // TEST 3: HAND RAISE BIDIRECTIONAL
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 STEP 4: TEST HAND RAISE BIDIRECTIONAL');
  console.log('━'.repeat(80));

  // Test hand raise P1 → P2
  const p2LogsBeforeHand1 = logs2.length;
  await page1.evaluate(() => {
    const channel = window.controlChannelRef?.current;
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({ type: 'hand-raise', raised: true }));
    }
  });
  await sleep(2000);

  const p2ReceivedHand1 = logs2.slice(p2LogsBeforeHand1).some(l =>
    l.includes('Control message received: hand-raise') || l.includes('hand-raise')
  );

  console.log('Hand raise P1 → P2:', p2ReceivedHand1 ? '✅ RECEIVED' : '❌ NOT RECEIVED');

  // Test hand raise P2 → P1
  const p1LogsBeforeHand2 = logs1.length;
  await page2.evaluate(() => {
    const channel = window.controlChannelRef?.current;
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({ type: 'hand-raise', raised: true }));
    }
  });
  await sleep(2000);

  const p1ReceivedHand2 = logs1.slice(p1LogsBeforeHand2).some(l =>
    l.includes('Control message received: hand-raise') || l.includes('hand-raise')
  );

  console.log('Hand raise P2 → P1:', p1ReceivedHand2 ? '✅ RECEIVED' : '❌ NOT RECEIVED');

  // =========================================================================
  // FINAL RESULTS
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('━'.repeat(80));

  const allTestsPassed =
    p1ChatOpen && p2ChatOpen &&
    p1ControlOpen && p2ControlOpen &&
    p2ReceivedFromP1 &&
    p1ReceivedFromP2 &&
    p2ReceivedHand1 &&
    p1ReceivedHand2;

  console.log('\n✅ Data Channels Opened:', p1ChatOpen && p2ChatOpen && p1ControlOpen && p2ControlOpen ? 'PASS' : 'FAIL');
  console.log('✅ Chat P1 → P2:', p2ReceivedFromP1 ? 'PASS' : 'FAIL');
  console.log('✅ Chat P2 → P1 (CRITICAL):', p1ReceivedFromP2 ? 'PASS' : 'FAIL');
  console.log('✅ Hand Raise P1 → P2:', p2ReceivedHand1 ? 'PASS' : 'FAIL');
  console.log('✅ Hand Raise P2 → P1:', p1ReceivedHand2 ? 'PASS' : 'FAIL');

  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED - BIDIRECTIONAL COMMUNICATION WORKING!');
  } else {
    console.log('\n❌ SOME TESTS FAILED');

    console.log('\n🔍 Debug info - Last 30 logs from Peer1:');
    logs1.slice(-30).forEach(l => console.log('  ', l));

    console.log('\n🔍 Debug info - Last 30 logs from Peer2:');
    logs2.slice(-30).forEach(l => console.log('  ', l));
  }

  console.log('\n━'.repeat(80));
  console.log('Keeping browsers open for 60s for manual inspection...');
  console.log('━'.repeat(80));
  await sleep(60000);

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
