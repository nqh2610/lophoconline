#!/usr/bin/env node
/**
 * SIMPLE AUTOMATED TEST
 * Assumes server is already running (npm run dev)
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'auto-' + Date.now();

console.log('\n🤖 AUTOMATED DEVICE SWITCH TEST');
console.log('=' .repeat(60));

async function main() {
  let browser;
  
  try {
    console.log('\n[1/4] Checking server...');
    const http = await import('http');
    const serverOk = await new Promise((resolve) => {
      const req = http.default.get(BASE_URL, () => resolve(true));
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });

    if (!serverOk) {
      console.log('❌ Server not running!');
      console.log('👉 Please start: npm run dev');
      return 1;
    }
    console.log('✅ Server is running');

    console.log('\n[2/4] Opening browser...');
    browser = await chromium.launch({ headless: false });
    const ctx = await browser.newContext({ viewport: null });

    // Results tracking
    let alertReceived = false;
    let alertMsg = null;

    console.log('\n[3/4] Running test scenario...');
    
    // Page 1: User1
    console.log('  → User1 joining...');
    const page1 = await ctx.newPage();
    await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=User1`);
    console.log('  ✅ User1 connected');
    await page1.waitForTimeout(1000);

    // Page 2: User2-Device1
    console.log('  → User2-Device1 joining...');
    const page2 = await ctx.newPage();
    page2.on('dialog', async (dialog) => {
      alertMsg = dialog.message();
      alertReceived = true;
      console.log(`  🚨 ALERT: "${alertMsg}"`);
      await dialog.accept();
    });
    await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=User2-Dev1`);
    console.log('  ✅ User2-Device1 connected');
    await page2.waitForTimeout(1500);

    // Page 3: User2-Device2 (SAME userId - should kick Device1)
    console.log('  → User2-Device2 joining (userId=200 again)...');
    const page3 = await ctx.newPage();
    await page3.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=User2-Dev2`);
    console.log('  ✅ User2-Device2 connected');

    // Wait for kick event
    console.log('  ⏳ Waiting for device switch event...');
    await page3.waitForTimeout(3000);

    console.log('\n[4/4] Results:');
    console.log('=' .repeat(60));
    
    if (alertReceived) {
      console.log('✅ PASS: Device switch detected!');
      console.log(`   Alert message: "${alertMsg}"`);
      console.log('\n🎉 TEST PASSED - Device switch working correctly!\n');
      
      // Keep open for visual confirmation
      console.log('   Keeping browser open for 5 seconds...');
      await page3.waitForTimeout(5000);
      
      return 0;
    } else {
      console.log('❌ FAIL: No alert received');
      console.log('   Expected: "Bạn đã đăng nhập từ thiết bị khác"');
      console.log('\n   Possible issues:');
      console.log('   • peer-replaced event not fired');
      console.log('   • Event handler not attached');
      console.log('   • Server not detecting device switch');
      console.log('\n   Keeping browser open for 10 seconds to inspect...');
      await page3.waitForTimeout(10000);
      return 1;
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return 1;
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed\n');
    }
  }
}

main().then(code => process.exit(code));
