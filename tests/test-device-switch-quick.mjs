#!/usr/bin/env node
/**
 * QUICK TEST: Verify device switch cleanup fix
 * Tests that peers are removed from room when SSE disconnects
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'quick-test-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🧪 QUICK TEST: Device Switch Cleanup');
console.log('='.repeat(60));

try {
  // Launch browsers
  console.log('\n[1/4] Launching browsers...');
  const browser1 = await chromium.launch({ headless: false });
  const browser2 = await chromium.launch({ headless: false });

  const page1 = await browser1.newPage();
  const page2 = await browser2.newPage();

  // User1 joins
  console.log('\n[2/4] User1 joining...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=User1`);
  await sleep(2000);
  console.log('✅ User1 joined');

  // User2 joins
  console.log('\n[3/4] User2 joining...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=User2-Dev1`);
  await sleep(3000);
  console.log('✅ User2-Dev1 joined');

  // Close User2's browser
  console.log('\n[4/4] User2-Dev1 closing (simulating device switch)...');
  await browser2.close();
  console.log('✅ User2-Dev1 browser closed');

  // Wait for cleanup
  console.log('\n⏳ Waiting 5s for server cleanup...');
  await sleep(5000);

  // User2 rejoins from "new device" (new browser)
  console.log('\n🔄 User2-Dev2 joining (new device)...');
  const browser3 = await chromium.launch({ headless: false });
  const page3 = await browser3.newPage();

  // Track errors
  let joinError = null;
  page3.on('console', msg => {
    const text = msg.text();
    if (text.includes('ROOM_FULL') || text.includes('đã đủ người')) {
      joinError = 'ROOM_FULL error detected!';
    }
  });

  await page3.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=User2-Dev2`);
  await sleep(3000);

  // Check result
  console.log('\n📊 TEST RESULT:');
  console.log('='.repeat(60));

  if (joinError) {
    console.log('❌ FAILED: ' + joinError);
    console.log('   Peer cleanup not working - room still shows 2 peers');
    console.log('\n💡 Expected: User2-Dev1 should be removed when browser closed');
    console.log('   Actual: Room still full, rejected User2-Dev2');
  } else {
    console.log('✅ PASSED: User2-Dev2 joined successfully!');
    console.log('   Peer cleanup working correctly');
  }

  console.log('\n⏳ Keeping browsers open for 5s for manual inspection...');
  await sleep(5000);

  // Cleanup
  await browser1.close();
  await browser3.close();

  console.log('\n✅ Test completed\n');
  process.exit(joinError ? 1 : 0);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error);
  process.exit(1);
}
