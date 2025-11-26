/**
 * Auto test camera toggle WITH VBG enabled
 */

import { chromium } from 'playwright';

const PREJOIN_URL = 'http://localhost:3000/prejoin-videolify-v2?accessToken=6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';

async function testCameraToggleWithVBG() {
  console.log('\n🧪 Testing Camera Toggle WITH VBG BLUR\n');

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
    if (text.includes('[Prejoin]') || text.includes('VBG') || text.includes('Virtual')) {
      console.log('   📝', text);
    }
  });

  // Start with camera ON + VBG BLUR
  await page.goto(PREJOIN_URL);
  await page.evaluate(() => {
    localStorage.setItem('videolify_prejoin_settings', JSON.stringify({
      isCameraEnabled: true,
      isMicEnabled: true,
      vbgEnabled: true,
      vbgMode: 'blur',
      vbgBlurAmount: 10,
      vbgActivePreset: null,
      vbgBackgroundImage: null,
      lastUpdated: Date.now(),
    }));
  });

  await page.reload();
  console.log('⏳ Waiting for initial load with VBG...');
  await page.waitForTimeout(4000);

  console.log('\n📹 Initial state: Camera ON + VBG BLUR');
  
  // Check initial state
  const initialCheck = await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video) return { srcObject: 'NO_VIDEO', tracks: 0, enabled: false };
    
    const srcObject = video.srcObject;
    if (!srcObject) return { srcObject: 'NO_SRC', tracks: 0, enabled: false };
    
    const videoTracks = srcObject.getVideoTracks();
    return {
      srcObject: 'HAS_SRC',
      tracks: videoTracks.length,
      enabled: videoTracks.length > 0 ? videoTracks[0].enabled : false,
    };
  });
  console.log(`   Video state:`, initialCheck);

  // Click camera toggle to turn OFF
  console.log('\n🖱️  Step 1: Turning camera OFF (VBG should be destroyed)...');
  logs.length = 0; // Clear logs
  
  await page.click('button:has-text("Camera"), button[aria-label*="camera"]').catch(async () => {
    await page.locator('svg.lucide-video, svg.lucide-video-off').first().click();
  });

  await page.waitForTimeout(1500);
  
  console.log('\n📊 Key logs after turning OFF:');
  const offLogs = logs.filter(log => 
    log.includes('Toggle camera') || 
    log.includes('destroy') || 
    log.includes('VBG') ||
    log.includes('useEffect')
  );
  offLogs.forEach(log => console.log('   ', log));

  const offCheck = await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video || !video.srcObject) return { srcObject: 'NO_SRC', tracks: 0, enabled: false };
    
    const videoTracks = video.srcObject.getVideoTracks();
    return {
      srcObject: 'HAS_SRC',
      tracks: videoTracks.length,
      enabled: videoTracks.length > 0 ? videoTracks[0].enabled : false,
    };
  });
  console.log(`\n   Video state after OFF:`, offCheck);

  // Click camera toggle to turn ON again (VBG should be reapplied)
  console.log('\n🖱️  Step 2: Turning camera ON (VBG should be reapplied)...');
  logs.length = 0; // Clear logs
  
  await page.waitForTimeout(500);
  await page.click('button:has-text("Camera"), button[aria-label*="camera"]').catch(async () => {
    await page.locator('svg.lucide-video, svg.lucide-video-off').first().click();
  });

  await page.waitForTimeout(2000); // Wait longer for VBG processing

  console.log('\n📊 Key logs after turning ON:');
  const onLogs = logs.filter(log => 
    log.includes('Toggle camera') || 
    log.includes('VBG') || 
    log.includes('Virtual') ||
    log.includes('useEffect') ||
    log.includes('Attaching')
  );
  onLogs.forEach(log => console.log('   ', log));

  // Check final state
  const finalCheck = await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video) return { srcObject: 'NO_VIDEO', tracks: 0, enabled: false };
    
    const srcObject = video.srcObject;
    if (!srcObject) return { srcObject: 'NO_SRC', tracks: 0, enabled: false };
    
    const videoTracks = srcObject.getVideoTracks();
    return {
      srcObject: 'HAS_SRC',
      tracks: videoTracks.length,
      enabled: videoTracks.length > 0 ? videoTracks[0].enabled : false,
    };
  });

  console.log(`\n📊 FINAL STATE:`);
  console.log(`   Video state:`, finalCheck);

  // Analysis
  const hasReapplyVBG = logs.some(log => log.includes('reapply VBG') || log.includes('Applying saved VBG'));
  const hasVBGApplied = logs.some(log => log.includes('Virtual background applied'));
  const hasAttaching = logs.some(log => log.includes('✅ Attaching'));

  console.log(`\n🔍 ANALYSIS:`);
  console.log(`   VBG reapply attempted: ${hasReapplyVBG ? '✅' : '❌'}`);
  console.log(`   VBG applied: ${hasVBGApplied ? '✅' : '❌'}`);
  console.log(`   useEffect attached stream: ${hasAttaching ? '❌ PROBLEM' : '✅ Correctly skipped'}`);

  if (finalCheck.srcObject === 'NO_SRC') {
    console.log(`\n❌ CRITICAL BUG: Video has no srcObject (BLACK SCREEN)`);
  } else if (!finalCheck.enabled) {
    console.log(`\n❌ CRITICAL BUG: Camera track is disabled`);
  } else if (!hasVBGApplied) {
    console.log(`\n⚠️  WARNING: VBG was not reapplied (camera works but no blur)`);
  } else {
    console.log(`\n✅ SUCCESS: Camera is ON with VBG`);
  }

  console.log('\n⏸️  Pausing 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);

  await browser.close();
}

testCameraToggleWithVBG().catch(console.error);
