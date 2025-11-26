/**
 * Simple Test: Initial Join Connection
 * Verify that initial connection works without F5
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:3000/test-videolify';
const ROOM_ID = `test-${Date.now()}`;

console.log('🧪 Testing Initial Join Connection');
console.log(`📍 Room: ${ROOM_ID}`);
console.log('='.repeat(60));

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  let browser1, browser2;

  try {
    // Launch browsers
    console.log('\n🚀 Launching browsers...');
    browser1 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });

    browser2 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });

    const page1 = await browser1.newPage();
    const page2 = await browser2.newPage();

    // Collect important logs
    const logs1 = [];
    const logs2 = [];

    page1.on('console', msg => {
      const text = msg.text();
      if (text.includes('Videolify') || text.includes('peer') || text.includes('Role') ||
          text.includes('Connection') || text.includes('offer') || text.includes('answer')) {
        logs1.push(text);
        console.log(`[Browser 1] ${text}`);
      }
    });

    page2.on('console', msg => {
      const text = msg.text();
      if (text.includes('Videolify') || text.includes('peer') || text.includes('Role') ||
          text.includes('Connection') || text.includes('offer') || text.includes('answer')) {
        logs2.push(text);
        console.log(`[Browser 2] ${text}`);
      }
    });

    console.log('\n✅ Browsers launched\n');

    // STEP 1: Browser 1 (Tutor) joins first
    console.log('👤 STEP 1: Browser 1 (Tutor) joining...');
    await page1.goto(
      `${TEST_URL}?room=${ROOM_ID}&testUserId=1&name=Tutor&role=tutor`,
      { waitUntil: 'networkidle2' }
    );

    console.log('⏳ Waiting 3s for initialization...');
    await delay(3000);

    // STEP 2: Browser 2 (Student) joins
    console.log('\n👤 STEP 2: Browser 2 (Student) joining...');
    await page2.goto(
      `${TEST_URL}?room=${ROOM_ID}&testUserId=2&name=Student&role=student`,
      { waitUntil: 'networkidle2' }
    );

    console.log('⏳ Waiting 10s for connection...');
    await delay(10000);

    // STEP 3: Check connection
    console.log('\n📊 STEP 3: Checking connection states...\n');

    const result1 = await page1.evaluate(() => {
      const debug = window.__VIDEOLIFY_DEBUG__;
      const pc = debug?.peerConnection;
      return {
        hasDebug: !!debug,
        connectionState: pc?.connectionState,
        iceConnectionState: pc?.iceConnectionState,
        signalingState: pc?.signalingState,
        hasRemoteStream: !!debug?.remoteStream,
        remoteTracks: debug?.remoteStream?.getTracks?.()?.length || 0
      };
    });

    const result2 = await page2.evaluate(() => {
      const debug = window.__VIDEOLIFY_DEBUG__;
      const pc = debug?.peerConnection;
      return {
        hasDebug: !!debug,
        connectionState: pc?.connectionState,
        iceConnectionState: pc?.iceConnectionState,
        signalingState: pc?.signalingState,
        hasRemoteStream: !!debug?.remoteStream,
        remoteTracks: debug?.remoteStream?.getTracks?.()?.length || 0
      };
    });

    console.log('Browser 1 State:', result1);
    console.log('Browser 2 State:', result2);

    // STEP 4: Verify success
    console.log('\n🎯 STEP 4: Verification\n');

    const success =
      result1.connectionState === 'connected' &&
      result2.connectionState === 'connected';

    if (success) {
      console.log('✅✅✅ SUCCESS! ✅✅✅');
      console.log('✅ Both peers connected');
      console.log('✅ Connection works WITHOUT F5!');
      console.log('✅ Fix verified!');
    } else {
      console.log('❌❌❌ FAILED ❌❌❌');
      console.log(`❌ Browser 1: ${result1.connectionState || 'unknown'}`);
      console.log(`❌ Browser 2: ${result2.connectionState || 'unknown'}`);

      // Check logs for clues
      console.log('\n📋 Browser 1 Key Logs:');
      logs1.filter(l =>
        l.includes('shouldInitiate') ||
        l.includes('Creating offer') ||
        l.includes('Role assigned')
      ).forEach(l => console.log(`  - ${l}`));

      console.log('\n📋 Browser 2 Key Logs:');
      logs2.filter(l =>
        l.includes('shouldInitiate') ||
        l.includes('Received offer') ||
        l.includes('Role assigned')
      ).forEach(l => console.log(`  - ${l}`));
    }

    console.log('\n⏳ Keeping browsers open for 20s...');
    await delay(20000);

    // BONUS: Test F5
    console.log('\n🔄 BONUS: Testing F5 refresh...');
    console.log('Refreshing Browser 2...');
    await page2.reload({ waitUntil: 'networkidle2' });

    console.log('⏳ Waiting 8s for reconnection...');
    await delay(8000);

    const result2AfterF5 = await page2.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      return {
        connectionState: pc?.connectionState,
        peerId: Object.keys(sessionStorage).find(k => k.startsWith('videolify-peer'))
      };
    });

    console.log('Browser 2 After F5:', result2AfterF5);

    if (result2AfterF5.connectionState === 'connected') {
      console.log('✅ F5 refresh also works!');
    } else {
      console.log('⚠️  F5 refresh needs more time or has issues');
    }

    console.log('\n⏳ Keeping browsers open for inspection (30s)...');
    await delay(30000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    console.log('\n🧹 Cleaning up...');
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
    console.log('✅ Test completed\n');
  }
}

main();
