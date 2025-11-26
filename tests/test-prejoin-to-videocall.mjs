/**
 * Test prejoin settings are applied in video call
 */

import { chromium } from 'playwright';

const PREJOIN_URL = 'http://localhost:3000/prejoin-videolify-v2?accessToken=6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';

async function testPrejoinToVideoCall() {
  console.log('\n🧪 Testing Prejoin → Video Call Settings Transfer\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });

  const page = await context.newPage();

  // Collect logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('[VideolifyFull_v2]') || text.includes('[Prejoin]')) {
      console.log('   📝', text);
    }
  });

  // Test Case 1: Camera OFF + Mic ON + VBG BLUR
  console.log('📋 Test Settings: Camera OFF, Mic ON, VBG BLUR\n');
  
  await page.goto(PREJOIN_URL);
  await page.evaluate(() => {
    localStorage.setItem('videolify_prejoin_settings', JSON.stringify({
      isCameraEnabled: false,
      isMicEnabled: true,
      vbgEnabled: true,
      vbgMode: 'blur',
      vbgBlurAmount: 15,
      vbgActivePreset: null,
      vbgBackgroundImage: null,
      lastUpdated: Date.now(),
    }));
  });

  await page.reload();
  console.log('⏳ Waiting for prejoin page...');
  await page.waitForTimeout(3000);

  console.log('\n🖱️  Clicking "Tham gia ngay" button...\n');
  logs.length = 0; // Clear logs
  
  await page.click('button:has-text("Tham gia"), button:has-text("Join")').catch(async () => {
    // Alternative Vietnamese text
    await page.locator('text=Tham gia ngay').click();
  });

  console.log('⏳ Waiting for video call page to load...');
  await page.waitForURL(/.*video-call-v2.*/);
  await page.waitForTimeout(3000);

  // Wait for stream to be ready
  console.log('⏳ Waiting for media stream initialization...');
  await page.waitForFunction(() => {
    const video = document.querySelectorAll('video')[0];
    return video && video.srcObject && video.srcObject.getTracks().length > 0;
  }, { timeout: 30000 }).catch(() => {
    console.warn('⚠️  Timeout waiting for stream - continuing anyway');
  });

  await page.waitForTimeout(5000); // Extra wait for VBG processing

  console.log('\n📊 Checking applied settings in Video Call:\n');

  // Check camera state - find local video (muted = local)
  const cameraState = await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll('video'));
    const localVideo = videos.find(v => v.muted) || videos[0]; // Local is muted
    
    if (!localVideo || !localVideo.srcObject) return { hasVideo: false, trackEnabled: null };
    
    const tracks = localVideo.srcObject.getVideoTracks();
    return {
      hasVideo: true,
      trackEnabled: tracks.length > 0 ? tracks[0].enabled : null,
      trackCount: tracks.length,
      videoIndex: videos.indexOf(localVideo),
    };
  });
  console.log(`   Camera: ${cameraState.trackEnabled === false ? '✅ OFF (correct)' : '❌ ON (wrong)'}`);
  console.log(`   Details:`, cameraState);

  // Check mic state  
  const micState = await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll('video'));
    const localVideo = videos.find(v => v.muted) || videos[0];
    
    if (!localVideo || !localVideo.srcObject) return { hasMic: false, trackEnabled: null };
    
    const tracks = localVideo.srcObject.getAudioTracks();
    return {
      hasMic: true,
      trackEnabled: tracks.length > 0 ? tracks[0].enabled : null,
      trackCount: tracks.length,
    };
  });
  console.log(`   Mic: ${micState.trackEnabled === true ? '✅ ON (correct)' : '❌ OFF (wrong)'}`);
  console.log(`   Details:`, micState);

  // Check VBG logs
  const hasVBGLoading = logs.some(log => log.includes('Applying prejoin virtual background'));
  const hasVBGApplied = logs.some(log => log.includes('Blur background applied'));
  const hasVBGError = logs.some(log => log.includes('Failed to apply prejoin VBG'));

  console.log(`   VBG Loading: ${hasVBGLoading ? '✅' : '❌'}`);
  console.log(`   VBG Applied: ${hasVBGApplied ? '✅' : '❌'}`);
  console.log(`   VBG Error: ${hasVBGError ? '⚠️ YES' : '✅ NO'}`);

  // Summary
  const cameraPassed = cameraState.trackEnabled === false;
  const micPassed = micState.trackEnabled === true;
  const vbgPassed = hasVBGApplied && !hasVBGError;

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Camera OFF: ${cameraPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Mic ON: ${micPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   VBG Blur: ${vbgPassed ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = cameraPassed && micPassed && vbgPassed;
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  console.log('\n⏸️  Pausing 15 seconds for manual inspection...');
  await page.waitForTimeout(15000);

  await browser.close();
}

testPrejoinToVideoCall().catch(console.error);
