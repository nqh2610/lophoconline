/**
 * Simple verification script for NEW VBG approach
 * Opens 2 browsers for manual testing
 */

import puppeteer from 'puppeteer';

const ROOM_ID = 'verify-vbg-' + Date.now();
const SERVER_URL = 'http://localhost:3000';

console.log('\n🧪 VBG FIX VERIFICATION');
console.log('='.repeat(60));
console.log('📋 Room ID:', ROOM_ID);
console.log('\n📌 Opening 2 browsers for manual testing...\n');

async function openBrowser(role, name, testUserId) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--window-size=800,900',
      `--window-position=${role === 'tutor' ? '0' : '820'},0`,
    ],
  });

  const page = await browser.newPage();
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(SERVER_URL, ['camera', 'microphone']);

  const testUrl = `${SERVER_URL}/test-videolify?room=${ROOM_ID}&name=${name}&role=${role}&testUserId=${testUserId}`;
  console.log(`✅ [${name}] Opening: ${testUrl}`);
  
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  
  return { browser, page };
}

async function main() {
  try {
    console.log('🚀 Opening Tutor browser...');
    const tutor = await openBrowser('tutor', 'Tutor', '1');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🚀 Opening Student browser...');
    const student = await openBrowser('student', 'Student', '2');
    
    console.log('\n' + '='.repeat(60));
    console.log('📌 MANUAL TEST INSTRUCTIONS');
    console.log('='.repeat(60));
    console.log('\n1. Wait for both videos to connect (10-15 seconds)');
    console.log('2. On TUTOR: Click Virtual Background → Blur');
    console.log('3. Verify:');
    console.log('   ✅ Tutor LOCAL video has blur');
    console.log('   ✅ Student sees Tutor video SMOOTH (no freeze)');
    console.log('   ✅ Check browser console for "Sending ORIGINAL camera track"');
    console.log('\n4. On TUTOR: Disable VBG');
    console.log('5. Verify both videos still smooth\n');
    console.log('='.repeat(60));
    console.log('Press Ctrl+C to close browsers when done\n');
    
    // Keep running until user presses Ctrl+C
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
