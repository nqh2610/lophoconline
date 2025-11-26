#!/usr/bin/env node
/**
 * SIMPLE AUTO TEST: Device Switch Detection
 * Requires server already running: npm run dev
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const TEST_ROOM = 'test-' + Date.now();

console.log('\n🔍 SIMPLE AUTO TEST: Device Switch Detection');
console.log('='.repeat(60));
console.log('⚠️  Make sure server is running: npm run dev\n');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
  let browser = null;

  try {
    // Launch ONE browser with 3 tabs (simulating 3 devices)
    console.log('📦 Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
      viewport: null
    });

    // Tab 1: User1
    console.log('\n👤 Tab 1: User1 joining...');
    const page1 = await context.newPage();
    await page1.goto(`${BASE_URL}/test-videolify?room=${TEST_ROOM}&testUserId=100&name=User1`);
    await page1.waitForLoadState('networkidle');
    console.log('✅ User1 joined');

    await sleep(1000);

    // Tab 2: User2 Device 1
    console.log('\n👤 Tab 2: User2-Device1 joining...');
    const page2 = await context.newPage();
    
    // Listen for console logs
    page2.on('console', msg => {
      const text = msg.text();
      if (text.includes('[SSE]') || text.includes('[Videolify]') || text.includes('peer-replaced')) {
        console.log(`  [Page2] ${text}`);
      }
    });
    
    // Listen for alerts on page2 (old device)
    let alertMessage = null;
    page2.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log(`\n🚨 ALERT on User2-Device1: "${alertMessage}"`);
      await dialog.accept();
    });

    await page2.goto(`${BASE_URL}/test-videolify?room=${TEST_ROOM}&testUserId=200&name=User2-Dev1`);
    await page2.waitForLoadState('networkidle');
    console.log('✅ User2-Device1 joined');

    await sleep(2000);

    // Tab 3: User2 Device 2 (SAME userId=200)
    console.log('\n🔄 Tab 3: User2-Device2 joining (DEVICE SWITCH)...');
    const page3 = await context.newPage();
    
    // Listen for console logs
    page3.on('console', msg => {
      const text = msg.text();
      if (text.includes('[SSE]') || text.includes('[Videolify]') || text.includes('peer-replaced')) {
        console.log(`  [Page3] ${text}`);
      }
    });
    
    await page3.goto(`${BASE_URL}/test-videolify?room=${TEST_ROOM}&testUserId=200&name=User2-Dev2`);
    await page3.waitForLoadState('networkidle');
    console.log('✅ User2-Device2 joined');

    // Wait for peer-replaced event to propagate
    console.log('\n⏳ Waiting 3 seconds for events...');
    await sleep(3000);

    // Check results
    console.log('\n📊 RESULTS:');
    console.log('='.repeat(60));

    if (alertMessage) {
      console.log('✅ SUCCESS: Alert received on old device');
      console.log(`   Message: "${alertMessage}"`);
    } else {
      console.log('❌ FAIL: No alert received on old device');
      console.log('   Expected: "Bạn đã đăng nhập từ thiết bị khác"');
    }

    // Check if pages are still active
    const page2Closed = page2.isClosed();
    const page3Active = !page3.isClosed();

    console.log(`\n📱 Device Status:`);
    console.log(`   User2-Device1 (old): ${page2Closed ? 'Closed ✅' : 'Still open ⚠️'}`);
    console.log(`   User2-Device2 (new): ${page3Active ? 'Active ✅' : 'Closed ❌'}`);

    // Manual inspection
    console.log('\n👀 MANUAL INSPECTION:');
    console.log('   Look at the browser tabs:');
    console.log('   - Tab 2 (User2-Dev1) should show alert or disconnect');
    console.log('   - Tab 3 (User2-Dev2) should be connected normally');
    console.log('   - Tab 1 (User1) should see User2-Dev2 (not Dev1)');
    
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await sleep(10000);

    // Final result
    if (alertMessage && page3Active) {
      console.log('\n🎉 TEST PASSED!');
      console.log('   ✅ Device switch detected correctly');
      console.log('   ✅ Old device was kicked');
      console.log('   ✅ New device connected successfully');
      return 0;
    } else {
      console.log('\n⚠️  TEST INCOMPLETE');
      if (!alertMessage) {
        console.log('   ❌ Old device did not receive kick notification');
      }
      if (!page3Active) {
        console.log('   ❌ New device failed to connect');
      }
      return 1;
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error);
    return 1;
  } finally {
    console.log('\n🧹 Closing browser...');
    if (browser) {
      await browser.close();
    }
    console.log('✅ Done!\n');
  }
}

// Run
runTest().then(exitCode => {
  process.exit(exitCode);
});
