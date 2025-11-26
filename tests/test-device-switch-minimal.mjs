/**
 * MINIMAL TEST: Device Switch Detection
 * Tests ONLY the device switch scenario to debug issue
 */

import { chromium } from 'playwright';

const SERVER_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupBrowser(name, roomId, testUserId, role) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ]
  });
  
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    // Log important events
    if (text.includes('P2P Connection') || 
        text.includes('peer-replaced') ||
        text.includes('thiết bị khác') ||
        text.includes('Session check') ||
        text.includes('DEVICE SWITCH') ||
        text.includes('TEST MODE')) {
      console.log(`[${name}] ${text}`);
    }
  });

  const url = `${SERVER_URL}/test-videolify?room=${roomId}&name=${name}&role=${role}&testUserId=${testUserId}`;
  console.log(`[${name}] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await sleep(2000);

  return { browser, page, name };
}

async function checkConnection(page) {
  return await page.evaluate(() => {
    const remoteVideo = document.querySelector('video#remote-video');
    if (!remoteVideo || !remoteVideo.srcObject) {
      return { trackCount: 0 };
    }
    const stream = remoteVideo.srcObject;
    const tracks = stream.getTracks();
    return { trackCount: tracks.length };
  });
}

async function main() {
  console.log('\n🧪 MINIMAL TEST: Device Switch Detection');
  console.log('='.repeat(80));

  const roomId = 'test-device-switch-' + Date.now();
  let user1, user2Device1, user2Device2;

  try {
    // Step 1: User1 (tutor) joins
    console.log('\n[Step 1] User1 (tutor) joins...');
    user1 = await setupBrowser('User1', roomId, '1', 'tutor');
    await sleep(3000);

    // Step 2: User2 (student) joins from Device 1
    console.log('\n[Step 2] User2 joins from Device 1...');
    user2Device1 = await setupBrowser('User2-Dev1', roomId, '2', 'student');
    await sleep(5000);

    const initialState = await checkConnection(user1.page);
    console.log(`\n[Check] User1 sees ${initialState.trackCount} tracks from Device1`);

    // Step 3: User2 joins from Device 2 (DEVICE SWITCH)
    console.log('\n[Step 3] User2 joins from Device 2 (DEVICE SWITCH)...');
    user2Device2 = await setupBrowser('User2-Dev2', roomId, '2', 'student');
    await sleep(8000); // Give time for device switch logic

    // Check results
    const finalState = await checkConnection(user1.page);
    console.log(`\n[Check] User1 sees ${finalState.trackCount} tracks after Device2 joins`);

    const dev1State = await checkConnection(user2Device1.page);
    console.log(`[Check] Device1 has ${dev1State.trackCount} tracks (should be 0)`);

    const dev2State = await checkConnection(user2Device2.page);
    console.log(`[Check] Device2 has ${dev2State.trackCount} tracks (should be 2)`);

    // Result
    console.log('\n' + '='.repeat(80));
    if (dev1State.trackCount === 0 && finalState.trackCount > 0) {
      console.log('✅ TEST PASSED: Device switch detected, old device disconnected');
    } else {
      console.log('❌ TEST FAILED: Device switch not working properly');
      console.log(`   Device1 tracks: ${dev1State.trackCount} (expected: 0)`);
      console.log(`   User1 reconnected: ${finalState.trackCount > 0}`);
    }

    await sleep(3000); // Keep browsers open to inspect

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    console.log('\n[Cleanup] Closing browsers...');
    if (user1) await user1.browser.close();
    if (user2Device1) await user2Device1.browser.close();
    if (user2Device2) await user2Device2.browser.close();
  }
}

// Check server
try {
  const response = await fetch(`${SERVER_URL}/api/health`);
  if (!response.ok) throw new Error('Server not running');
  console.log('✅ Server is running\n');
  await main();
} catch (error) {
  console.error('❌ Server is not running. Start with: npm run dev');
  process.exit(1);
}
