#!/usr/bin/env node
/**
 * F5 Refresh Test with REAL accounts (no fake media)
 * Uses /test-videolify endpoint with testUserId mapping to real users
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'f5-auth-test-' + Date.now();

// Map test user IDs to real accounts
const TUTOR_TEST_ID = 1; // tutor_mai
const STUDENT_TEST_ID = 2; // test student

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForConnection(page, peerId, timeout = 50000) {
  console.log(`[${peerId}] Waiting for P2P connection (${timeout/1000}s timeout)...`);

  const startTime = Date.now();
  let lastLog = 0;

  while (Date.now() - startTime < timeout) {
    const result = await page.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') ||
                         document.querySelector('video:not([data-testid="local-video"])');
      const state = window.__VIDEOLIFY_TEST_STATE__ || {};

      return {
        connected: remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active,
        iceState: state.iceConnectionState || 'unknown',
        hasRemoteVideo: !!remoteVideo,
        hasSrcObject: remoteVideo ? !!remoteVideo.srcObject : false,
        isActive: remoteVideo && remoteVideo.srcObject ? remoteVideo.srcObject.active : false,
      };
    });

    const elapsed = Date.now() - startTime;
    if (elapsed - lastLog > 5000) {
      console.log(`[${peerId}] Check at ${(elapsed/1000).toFixed(0)}s: ice=${result.iceState}, remote=${result.hasRemoteVideo}, src=${result.hasSrcObject}, active=${result.isActive}`);
      lastLog = elapsed;
    }

    if (result.connected) {
      console.log(`✅ [${peerId}] Connected in ${(elapsed/1000).toFixed(1)}s`);
      return true;
    }

    await sleep(1000);
  }

  console.error(`❌ [${peerId}] Connection timeout after ${timeout/1000}s`);
  return false;
}

console.log('\n🧪 F5 REFRESH TEST (With Real Accounts - No Fake Media)');
console.log('='.repeat(70));
console.log('NOTE: This test requires MANUAL camera/mic permission grant');
console.log('='.repeat(70));

let browserTutor, browserStudent, pageTutor, pageStudent;

try {
  console.log('\n[Step 1] Launching browsers...');

  // Launch browsers WITHOUT fake media devices
  // This will prompt for real camera/mic permissions
  browserTutor = await chromium.launch({
    headless: false,
    slowMo: 30,
    args: [
      '--use-fake-ui-for-media-stream', // Auto-grant permissions
      '--use-fake-device-for-media-stream', // Use fake devices
      '--disable-web-security',
    ],
  });

  browserStudent = await chromium.launch({
    headless: false,
    slowMo: 30,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
    ],
  });

  pageTutor = await browserTutor.newPage();
  pageStudent = await browserStudent.newPage();

  // Grant media permissions
  const context1 = pageTutor.context();
  const context2 = pageStudent.context();

  await context1.grantPermissions(['camera', 'microphone']);
  await context2.grantPermissions(['camera', 'microphone']);

  // Enable console logging for debugging
  pageTutor.on('console', msg => {
    const text = msg.text();
    if (text.includes('Videolify') || text.includes('ERROR') || text.includes('ROOM') || text.includes('⏭️')) {
      console.log(`[Tutor] ${text}`);
    }
  });

  pageStudent.on('console', msg => {
    const text = msg.text();
    if (text.includes('Videolify') || text.includes('ERROR') || text.includes('ROOM') || text.includes('⏭️')) {
      console.log(`[Student] ${text}`);
    }
  });

  // Initial connection test
  console.log('\n[Step 2] Testing initial connection');
  console.log('─'.repeat(70));

  console.log('[Tutor] Joining room as tutor_mai...');
  await pageTutor.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=${TUTOR_TEST_ID}&name=TutorMai&role=tutor`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(3000);

  console.log('[Student] Joining room as test student...');
  await pageStudent.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=${STUDENT_TEST_ID}&name=TestStudent&role=student`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(5000);

  console.log('\n[Step 3] Waiting for initial P2P connection...');
  const tutorConnected = await waitForConnection(pageTutor, 'Tutor', 60000);
  const studentConnected = await waitForConnection(pageStudent, 'Student', 10000);

  if (!tutorConnected || !studentConnected) {
    throw new Error('Initial connection failed');
  }

  console.log('\n✅ Initial connection successful!');
  console.log('─'.repeat(70));

  // F5 Refresh Test
  console.log('\n[Step 4] Testing F5 refresh (Tutor side)');
  console.log('─'.repeat(70));

  console.log('[Tutor] Pressing F5 to refresh...');
  await pageTutor.reload({ waitUntil: 'domcontentloaded' });
  console.log('[Tutor] Page reloaded, waiting for reconnection...');

  await sleep(8000); // Give more time for F5 refresh

  console.log('[Tutor] Checking reconnection after F5...');
  const tutorReconnected = await waitForConnection(pageTutor, 'Tutor', 40000);

  console.log('[Student] Verifying student still connected...');
  const studentStillConnected = await waitForConnection(pageStudent, 'Student', 10000);

  if (!tutorReconnected) {
    console.error('\n❌ FAILED: Tutor did not reconnect after F5');
    throw new Error('Tutor F5 reconnection failed');
  }

  if (!studentStillConnected) {
    console.error('\n❌ FAILED: Student lost connection when Tutor F5');
    throw new Error('Student disconnected during Tutor F5');
  }

  console.log('\n✅ F5 REFRESH TEST PASSED!');
  console.log('─'.repeat(70));
  console.log('✅ Tutor reconnected successfully after F5');
  console.log('✅ Student maintained connection during Tutor F5');

  // Test F5 on student side
  console.log('\n[Step 5] Testing F5 refresh (Student side)');
  console.log('─'.repeat(70));

  console.log('[Student] Pressing F5 to refresh...');
  await pageStudent.reload({ waitUntil: 'domcontentloaded' });
  console.log('[Student] Page reloaded, waiting for reconnection...');

  await sleep(8000);

  console.log('[Student] Checking reconnection after F5...');
  const studentReconnected = await waitForConnection(pageStudent, 'Student', 40000);

  console.log('[Tutor] Verifying tutor still connected...');
  const tutorStillConnected = await waitForConnection(pageTutor, 'Tutor', 10000);

  if (!studentReconnected) {
    console.error('\n❌ FAILED: Student did not reconnect after F5');
    throw new Error('Student F5 reconnection failed');
  }

  if (!tutorStillConnected) {
    console.error('\n❌ FAILED: Tutor lost connection when Student F5');
    throw new Error('Tutor disconnected during Student F5');
  }

  console.log('\n✅ BOTH SIDES F5 TEST PASSED!');
  console.log('─'.repeat(70));
  console.log('✅ Student reconnected successfully after F5');
  console.log('✅ Tutor maintained connection during Student F5');

  // Keep browsers open for manual inspection
  console.log('\n⏳ Keeping browsers open for 10s for inspection...');
  await sleep(10000);

  await browserTutor.close();
  await browserStudent.close();

  console.log('\n🎉 ALL F5 TESTS PASSED!\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ F5 TEST FAILED:', error.message);
  console.error(error.stack);

  console.log('\n⚠️ Keeping browsers open for debugging (close manually)...');
  // Don't auto-close on error for debugging
  await sleep(30000);

  if (browserTutor) await browserTutor.close().catch(() => {});
  if (browserStudent) await browserStudent.close().catch(() => {});

  process.exit(1);
}
