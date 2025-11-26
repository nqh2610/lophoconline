/**
 * Quick Test for Option 1: Device Switch Detection
 * Tests if server correctly detects and handles device switch
 */

import playwright from 'playwright';
const { chromium } = playwright;
import { setTimeout as sleep } from 'timers/promises';

const SERVER_URL = 'http://localhost:3000';
const ROOM_ID = 'test-opt1-' + Date.now();

async function setupBrowser(name, userId) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await context.newPage();

  let peerReplacedReceived = false;
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Peer replaced event')) {
      console.log(`[${name}] 🔄 ${text}`);
      peerReplacedReceived = true;
    }
    if (text.includes('P2P Connection')) {
      console.log(`[${name}] ✅ ${text}`);
    }
    if (text.includes('Peer left')) {
      console.log(`[${name}] 👋 ${text}`);
    }
  });

  const url = `${SERVER_URL}/test-videolify?room=${ROOM_ID}&name=${name}&role=tutor&testUserId=${userId}`;
  console.log(`[${name}] Opening: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await sleep(2000);

  return { browser, page, getPeerReplacedStatus: () => peerReplacedReceived };
}

async function runTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Quick Test: Option 1 Device Switch Detection');
  console.log('='.repeat(80));

  let user1, user2Dev1, user2Dev2;

  try {
    // Step 1: User1 joins
    console.log('\n📌 Step 1: User1 joins');
    user1 = await setupBrowser('User1', 1);
    await sleep(2000);

    // Step 2: User2 Device1 joins
    console.log('\n📌 Step 2: User2 Device1 joins');
    user2Dev1 = await setupBrowser('User2-Dev1', 2);
    await sleep(5000);

    console.log('\n✅ Initial P2P connection should be established');

    // Step 3: User2 Device2 joins (same userId=2, different browser)
    console.log('\n📌 Step 3: User2 Device2 joins (DEVICE SWITCH!)');
    console.log('Expected: Server detects userId=2 already connected, kicks Dev1');
    
    user2Dev2 = await setupBrowser('User2-Dev2', 2);
    await sleep(5000);

    // Step 4: Check results
    console.log('\n📌 Step 4: Check Results');
    
    const dev1Replaced = user2Dev1.getPeerReplacedStatus();
    const user1Replaced = user1.getPeerReplacedStatus();
    
    console.log(`\nUser2-Dev1 received peer-replaced: ${dev1Replaced ? '✅' : '❌'}`);
    console.log(`User1 received peer-replaced about User2: ${user1Replaced ? '✅' : '❌'}`);

    console.log('\n' + '='.repeat(80));
    if (dev1Replaced && user1Replaced) {
      console.log('🎉 TEST PASSED: Device switch detected correctly!');
    } else {
      console.log('❌ TEST FAILED: Device switch not detected');
    }
    console.log('='.repeat(80));

    await sleep(5000);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
  } finally {
    console.log('\n🧹 Cleaning up...');
    if (user1) await user1.browser.close();
    if (user2Dev1) await user2Dev1.browser.close();
    if (user2Dev2) await user2Dev2.browser.close();
  }
}

// Check server
console.log('🔍 Checking server...');
try {
  const response = await fetch(SERVER_URL);
  if (!response.ok) throw new Error('Server not running');
  console.log('✅ Server running\n');
  await runTest();
} catch (error) {
  console.error('❌ Server not running. Start with: npm run dev');
  process.exit(1);
}
