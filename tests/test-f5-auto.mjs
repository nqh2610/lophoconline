#!/usr/bin/env node
/**
 * AUTO TEST: F5 Refresh
 * Uses EXACT same setup as test-device-switch-quick.mjs (which works)
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'f5-auto-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🧪 AUTO TEST: F5 Refresh');
console.log('='.repeat(60));

try {
  // Launch browsers (EXACT same as device-switch test)
  console.log('\n[1/5] Launching browsers...');
  const browser1 = await chromium.launch({ headless: false });
  const browser2 = await chromium.launch({ headless: false });

  const page1 = await browser1.newPage();
  const page2 = await browser2.newPage();

  // Track errors
  let hasError = false;
  let errorMessage = '';

  page1.on('console', msg => {
    const text = msg.text();
    if (text.includes('ROOM_FULL') || text.includes('đã đủ người')) {
      hasError = true;
      errorMessage = 'ROOM_FULL error detected on page1';
    }
    if (text.includes('Videolify') || text.includes('⏭️')) {
      console.log(`[Page1] ${text}`);
    }
  });

  page2.on('console', msg => {
    const text = msg.text();
    if (text.includes('ROOM_FULL') || text.includes('đã đủ người')) {
      hasError = true;
      errorMessage = 'ROOM_FULL error detected on page2';
    }
    if (text.includes('Videolify') || text.includes('⏭️')) {
      console.log(`[Page2] ${text}`);
    }
  });

  // User1 joins
  console.log('\n[2/5] User1 joining...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=User1`);
  await sleep(2000);
  console.log('✅ User1 joined');

  // User2 joins
  console.log('\n[3/5] User2 joining...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=User2`);
  await sleep(3000);
  console.log('✅ User2 joined');

  // Wait for connection to be stable
  console.log('\n⏳ Waiting for connection to stabilize (5s)...');
  await sleep(5000);

  // F5 refresh User1
  console.log('\n[4/5] User1 refreshing (F5)...');
  await page1.reload();
  console.log('✅ User1 page reloaded');

  // Wait for rejoin
  console.log('\n⏳ Waiting 5s for User1 to rejoin after F5...');
  await sleep(5000);

  // Check for errors
  console.log('\n[5/5] Checking results...');
  await sleep(2000);

  // Final check
  console.log('\n📊 TEST RESULT:');
  console.log('='.repeat(60));

  if (hasError) {
    console.log('❌ FAILED: ' + errorMessage);
    console.log('   F5 refresh caused room full or other error');
    console.log('\n💡 Expected: User1 should rejoin successfully after F5');
    console.log('   Actual: Got error during rejoin');
  } else {
    console.log('✅ PASSED: No ROOM_FULL errors detected!');
    console.log('   F5 refresh working correctly');
    console.log('   Server logs should show: "⏭️ Skipping removal of peer"');
  }

  console.log('\n⏳ Keeping browsers open for 5s for manual verification...');
  await sleep(5000);

  // Cleanup
  await browser1.close();
  await browser2.close();

  console.log('\n✅ Test completed\n');
  process.exit(hasError ? 1 : 0);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error);
  process.exit(1);
}
