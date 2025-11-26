/**
 * Auto test camera toggle with console logs
 */

import { chromium } from 'playwright';

const PREJOIN_URL = 'http://localhost:3000/prejoin-videolify-v2?accessToken=6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';

async function testCameraToggle() {
  console.log('\n🧪 Testing Camera Toggle with Logs\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });

  const page = await context.newPage();

  // Collect all console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('[Prejoin]')) {
      console.log('   📝', text);
    }
  });

  // Start with camera ON + no VBG
  await page.goto(PREJOIN_URL);
  await page.evaluate(() => {
    localStorage.setItem('videolify_prejoin_settings', JSON.stringify({
      isCameraEnabled: true,
      isMicEnabled: true,
      vbgEnabled: false,
      vbgMode: 'none',
      vbgBlurAmount: 10,
      vbgActivePreset: null,
      vbgBackgroundImage: null,
      lastUpdated: Date.now(),
    }));
  });

  await page.reload();
  console.log('⏳ Waiting for initial load...');
  await page.waitForTimeout(3000);

  console.log('\n📹 Initial state: Camera ON');
  
  // Check initial state
  const initialSrcObject = await page.evaluate(() => {
    const video = document.querySelector('video');
    return video?.srcObject ? 'HAS_SRC' : 'NO_SRC';
  });
  console.log(`   Video srcObject: ${initialSrcObject}`);

  // Click camera toggle to turn OFF
  console.log('\n🖱️  Step 1: Clicking to turn camera OFF...');
  logs.length = 0; // Clear logs
  
  await page.click('button:has-text("Camera"), button[aria-label*="camera"]').catch(async () => {
    // Alternative: click the video icon directly
    await page.locator('svg.lucide-video, svg.lucide-video-off').first().click();
  });

  await page.waitForTimeout(1000);
  
  console.log('\n📊 Logs after turning OFF:');
  logs.forEach(log => {
    if (log.includes('[Prejoin]')) console.log('   ', log);
  });

  // Check camera OFF state
  const offSrcObject = await page.evaluate(() => {
    const video = document.querySelector('video');
    return video?.srcObject ? 'HAS_SRC' : 'NO_SRC';
  });
  console.log(`\n   Video srcObject after OFF: ${offSrcObject}`);

  // Click camera toggle to turn ON again
  console.log('\n🖱️  Step 2: Clicking to turn camera ON again...');
  logs.length = 0; // Clear logs
  
  await page.waitForTimeout(500);
  await page.click('button:has-text("Camera"), button[aria-label*="camera"]').catch(async () => {
    await page.locator('svg.lucide-video, svg.lucide-video-off').first().click();
  });

  await page.waitForTimeout(1000);

  console.log('\n📊 Logs after turning ON:');
  logs.forEach(log => {
    if (log.includes('[Prejoin]')) console.log('   ', log);
  });

  // Check final state
  const finalSrcObject = await page.evaluate(() => {
    const video = document.querySelector('video');
    return video?.srcObject ? 'HAS_SRC' : 'NO_SRC';
  });

  const isCameraEnabled = await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video || !video.srcObject) return false;
    const tracks = video.srcObject.getVideoTracks();
    return tracks.length > 0 && tracks[0].enabled;
  });

  console.log(`\n📊 FINAL STATE:`);
  console.log(`   Video srcObject: ${finalSrcObject}`);
  console.log(`   Camera enabled: ${isCameraEnabled ? '✅ YES' : '❌ NO'}`);

  // Analysis
  const hasToggleStart = logs.some(log => log.includes('🎬 Toggle camera START'));
  const hasFlagSet = logs.some(log => log.includes('🚩 Flag set to TRUE'));
  const hasSkipping = logs.some(log => log.includes('⚠️ Skipping'));
  const hasAttaching = logs.some(log => log.includes('✅ Attaching'));
  const hasUseEffect = logs.some(log => log.includes('useEffect localStreamState triggered'));

  console.log(`\n🔍 ANALYSIS:`);
  console.log(`   Toggle START logged: ${hasToggleStart ? '✅' : '❌'}`);
  console.log(`   Flag set logged: ${hasFlagSet ? '✅' : '❌'}`);
  console.log(`   useEffect triggered: ${hasUseEffect ? '✅' : '❌'}`);
  console.log(`   Skipping logged: ${hasSkipping ? '✅' : '❌'}`);
  console.log(`   Attaching logged: ${hasAttaching ? '✅' : '❌'}`);

  if (hasUseEffect && hasAttaching && !hasSkipping) {
    console.log(`\n❌ PROBLEM: useEffect ran and attached stream (should have been skipped!)`);
  } else if (hasUseEffect && hasSkipping) {
    console.log(`\n✅ GOOD: useEffect was properly skipped`);
  }

  if (finalSrcObject === 'NO_SRC') {
    console.log(`\n❌ CRITICAL: Video has no srcObject (BLACK SCREEN)`);
  } else if (!isCameraEnabled) {
    console.log(`\n❌ CRITICAL: Camera track is disabled (should be enabled)`);
  } else {
    console.log(`\n✅ SUCCESS: Camera is ON with srcObject`);
  }

  console.log('\n⏸️  Pausing 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);

  await browser.close();
}

testCameraToggle().catch(console.error);
