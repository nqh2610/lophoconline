/**
 * COMPREHENSIVE SCREEN SHARE TEST
 * Tests all scenarios:
 * 1. Normal camera → Screen share
 * 2. Blocked camera (dummy tracks) → Screen share
 * 3. Verify remote sees screen in both cases
 * 4. Verify connection stability
 */

import { chromium } from 'playwright';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 20000
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNormalCameraShare() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 1: NORMAL CAMERA → SCREEN SHARE');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const room = 'test-normal-share-' + Date.now();
  
  try {
    // TUTOR: Join with camera
    console.log('\n🟦 TUTOR: Joining with camera...');
    const tutorContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const tutorPage = await tutorContext.newPage();
    await tutorPage.goto(`${TEST_CONFIG.baseUrl}/test-videolify?room=${room}&name=Tutor`);
    await sleep(3000);
    
    // STUDENT: Join with camera
    console.log('🟩 STUDENT: Joining with camera...');
    const studentContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const studentPage = await studentContext.newPage();
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/test-videolify?room=${room}&name=Student`);
    await sleep(3000);
    
    // Wait for connection
    console.log('\n🔗 Waiting for connection...');
    const tutorConnected = await tutorPage.waitForSelector('[data-testid="connection-status-dot"][style*="rgb(34, 197, 94)"]', { 
      timeout: TEST_CONFIG.timeout 
    }).then(() => true).catch(() => false);
    
    if (!tutorConnected) {
      console.error('❌ FAIL: Connection failed');
      return false;
    }
    console.log('✅ Connected');
    
    // Check initial state - NO "Camera tắt" overlay
    await sleep(1000);
    const initialOverlay = await tutorPage.locator('text=Camera tắt').count();
    console.log(`\n📹 Initial state - "Camera tắt" overlay: ${initialOverlay} ${initialOverlay === 0 ? '✅' : '❌'}`);
    
    // STUDENT: Start screen share
    console.log('\n📺 STUDENT: Starting screen share...');
    
    // Mock getDisplayMedia
    await studentPage.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.font = '80px Arial';
        ctx.fillText('🖥️ SCREEN SHARE - NORMAL CAMERA', 200, 540);
      }
      const fakeScreenStream = canvas.captureStream(15);
      
      navigator.mediaDevices.getDisplayMedia = function() {
        console.log('📺 [MOCK] getDisplayMedia called');
        return Promise.resolve(fakeScreenStream);
      };
    });
    
    // Click share button
    const shareButton = studentPage.locator('[data-testid="screen-share-button"]');
    await shareButton.click();
    await sleep(2000);
    
    console.log('✅ Screen share started');
    
    // VERIFY: Tutor sees screen
    console.log('\n👁️ VERIFY: Tutor should see screen...');
    
    const tutorRemoteVideo = await tutorPage.evaluate(() => {
      const video = document.querySelector('[data-testid="remote-video"]');
      return {
        exists: !!video,
        visible: video && window.getComputedStyle(video).display !== 'none',
        playing: video && !video.paused && video.readyState >= 2,
        width: video?.videoWidth || 0,
        height: video?.videoHeight || 0
      };
    });
    
    console.log('   Video exists:', tutorRemoteVideo.exists ? '✅' : '❌');
    console.log('   Video visible:', tutorRemoteVideo.visible ? '✅' : '❌');
    console.log('   Video playing:', tutorRemoteVideo.playing ? '✅' : '❌');
    console.log('   Resolution:', tutorRemoteVideo.width + 'x' + tutorRemoteVideo.height);
    
    // Check overlay should NOT show during screen share
    const overlayDuringShare = await tutorPage.locator('text=Camera tắt').count();
    console.log(`   "Camera tắt" overlay: ${overlayDuringShare} ${overlayDuringShare === 0 ? '✅' : '❌'}`);
    
    // STUDENT: Stop screen share
    console.log('\n🛑 STUDENT: Stopping screen share...');
    await shareButton.click();
    await sleep(2000);
    
    // VERIFY: Connection still stable
    const stillConnected = await tutorPage.locator('[data-testid="connection-status-dot"][style*="rgb(34, 197, 94)"]').count();
    console.log(`\n🔍 Connection after stop: ${stillConnected > 0 ? '✅ STABLE' : '❌ LOST'}`);
    
    // Check overlay should NOT show (normal camera)
    const overlayAfterStop = await tutorPage.locator('text=Camera tắt').count();
    console.log(`   "Camera tắt" overlay: ${overlayAfterStop} ${overlayAfterStop === 0 ? '✅' : '❌'}`);
    
    // FINAL RESULT
    const allPass = tutorConnected && 
                    tutorRemoteVideo.visible && 
                    tutorRemoteVideo.playing &&
                    overlayDuringShare === 0 &&
                    stillConnected > 0 &&
                    overlayAfterStop === 0;
    
    console.log('\n' + '='.repeat(60));
    if (allPass) {
      console.log('✅✅✅ TEST 1 PASSED: Normal camera screen share works!');
    } else {
      console.log('❌❌❌ TEST 1 FAILED');
    }
    console.log('='.repeat(60));
    
    return allPass;
    
  } catch (error) {
    console.error('\n❌ TEST 1 ERROR:', error.message);
    return false;
  } finally {
    await sleep(1000);
    await browser.close();
  }
}

async function testBlockedCameraShare() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST 2: BLOCKED CAMERA (DUMMY) → SCREEN SHARE');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const room = 'test-blocked-share-' + Date.now();
  
  try {
    // TUTOR: Join with camera
    console.log('\n🟦 TUTOR: Joining with camera...');
    const tutorContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const tutorPage = await tutorContext.newPage();
    await tutorPage.goto(`${TEST_CONFIG.baseUrl}/test-videolify?room=${room}&name=Tutor`);
    await sleep(3000);
    
    // STUDENT: Join with BLOCKED camera
    console.log('🟩 STUDENT: Joining with BLOCKED camera...');
    const studentContext = await browser.newContext({ permissions: [] });
    const studentPage = await studentContext.newPage();
    
    // Mock getUserMedia to fail
    await studentPage.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = function() {
        console.log('🔒 [BLOCKED] getUserMedia denied');
        return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      };
    });
    
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/test-videolify?room=${room}&name=Student`);
    await sleep(5000); // Wait for VBG timeout + dummy tracks
    
    // Wait for connection
    console.log('\n🔗 Waiting for connection...');
    const tutorConnected = await tutorPage.waitForSelector('[data-testid="connection-status-dot"][style*="rgb(34, 197, 94)"]', { 
      timeout: TEST_CONFIG.timeout 
    }).then(() => true).catch(() => false);
    
    if (!tutorConnected) {
      console.error('❌ FAIL: Connection failed with dummy tracks');
      return false;
    }
    console.log('✅ Connected (with dummy tracks)');
    
    // Check initial state - SHOULD show "Camera tắt" overlay
    await sleep(1000);
    const initialOverlay = await tutorPage.locator('text=Camera tắt').count();
    console.log(`\n📹 Initial state - "Camera tắt" overlay: ${initialOverlay} ${initialOverlay > 0 ? '✅' : '❌'}`);
    
    // STUDENT: Start screen share
    console.log('\n📺 STUDENT: Starting screen share (while using dummy tracks)...');
    
    // Mock getDisplayMedia
    await studentPage.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '80px Arial';
        ctx.fillText('🖥️ SCREEN SHARE - BLOCKED CAMERA', 150, 540);
      }
      const fakeScreenStream = canvas.captureStream(15);
      
      navigator.mediaDevices.getDisplayMedia = function() {
        console.log('📺 [MOCK] getDisplayMedia called');
        return Promise.resolve(fakeScreenStream);
      };
    });
    
    // Click share button
    const shareButton = studentPage.locator('[data-testid="screen-share-button"]');
    await shareButton.click();
    await sleep(2000);
    
    console.log('✅ Screen share started');
    
    // VERIFY: Tutor sees screen (NOT "Camera tắt" overlay!)
    console.log('\n👁️ VERIFY: Tutor should see screen (NOT overlay)...');
    
    const tutorRemoteVideo = await tutorPage.evaluate(() => {
      const video = document.querySelector('[data-testid="remote-video"]');
      return {
        exists: !!video,
        visible: video && window.getComputedStyle(video).display !== 'none',
        playing: video && !video.paused && video.readyState >= 2,
        width: video?.videoWidth || 0,
        height: video?.videoHeight || 0
      };
    });
    
    console.log('   Video exists:', tutorRemoteVideo.exists ? '✅' : '❌');
    console.log('   Video visible:', tutorRemoteVideo.visible ? '✅' : '❌');
    console.log('   Video playing:', tutorRemoteVideo.playing ? '✅' : '❌');
    console.log('   Resolution:', tutorRemoteVideo.width + 'x' + tutorRemoteVideo.height);
    
    // CRITICAL: Overlay should NOT show during screen share!
    const overlayDuringShare = await tutorPage.locator('text=Camera tắt').count();
    console.log(`   "Camera tắt" overlay: ${overlayDuringShare} ${overlayDuringShare === 0 ? '✅ CORRECT' : '❌ BUG - SHOULD BE HIDDEN'}`);
    
    // STUDENT: Stop screen share
    console.log('\n🛑 STUDENT: Stopping screen share...');
    await shareButton.click();
    await sleep(2000);
    
    // VERIFY: Connection still stable
    const stillConnected = await tutorPage.locator('[data-testid="connection-status-dot"][style*="rgb(34, 197, 94)"]').count();
    console.log(`\n🔍 Connection after stop: ${stillConnected > 0 ? '✅ STABLE' : '❌ LOST'}`);
    
    // Check overlay should REAPPEAR (back to dummy tracks)
    const overlayAfterStop = await tutorPage.locator('text=Camera tắt').count();
    console.log(`   "Camera tắt" overlay: ${overlayAfterStop} ${overlayAfterStop > 0 ? '✅ CORRECT' : '❌ BUG - SHOULD SHOW'}`);
    
    // FINAL RESULT
    const allPass = tutorConnected && 
                    initialOverlay > 0 && // Should show initially
                    tutorRemoteVideo.visible && 
                    tutorRemoteVideo.playing &&
                    overlayDuringShare === 0 && // Should hide during share
                    stillConnected > 0 &&
                    overlayAfterStop > 0; // Should reappear after stop
    
    console.log('\n' + '='.repeat(60));
    if (allPass) {
      console.log('✅✅✅ TEST 2 PASSED: Blocked camera screen share works!');
    } else {
      console.log('❌❌❌ TEST 2 FAILED');
    }
    console.log('='.repeat(60));
    
    return allPass;
    
  } catch (error) {
    console.error('\n❌ TEST 2 ERROR:', error.message);
    return false;
  } finally {
    await sleep(1000);
    await browser.close();
  }
}

async function main() {
  console.log('\n🎯 COMPREHENSIVE SCREEN SHARE TEST SUITE');
  console.log('Testing all scenarios for screen sharing functionality\n');
  
  const test1Pass = await testNormalCameraShare();
  await sleep(2000);
  
  const test2Pass = await testBlockedCameraShare();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log('TEST 1 (Normal Camera → Share):', test1Pass ? '✅ PASS' : '❌ FAIL');
  console.log('TEST 2 (Blocked Camera → Share):', test2Pass ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(60));
  
  if (test1Pass && test2Pass) {
    console.log('\n🎉🎉🎉 ALL TESTS PASSED! Screen share works in all scenarios!');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Screen share needs fixing');
  }
  console.log('');
}

main();
