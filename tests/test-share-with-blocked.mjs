/**
 * TEST: Screen sharing when camera is blocked
 * 
 * Scenario:
 * 1. Student blocks camera → uses dummy tracks
 * 2. Student starts screen share
 * 3. Verify: Tutor sees student's screen
 * 4. Student stops screen share
 * 5. Verify: Connection still stable, tutor sees "Camera tắt" overlay
 */

import { chromium } from 'playwright';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  room: 'test-share-blocked-' + Date.now(),
  studentName: '📚 Student',
  tutorName: '👨‍🏫 Tutor',
  timeout: 20000 // 20s
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🧪 TEST: Screen Share with Blocked Camera\n');
  console.log('📋 Config:', TEST_CONFIG);
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false });

  try {
    // ============================================
    // 1. TUTOR: Join with real camera
    // ============================================
    console.log('\n🟦 STEP 1: Tutor joins with camera');
    const tutorContext = await browser.newContext({
      permissions: ['camera', 'microphone']
    });
    const tutorPage = await tutorContext.newPage();
    
    await tutorPage.goto(`${TEST_CONFIG.baseUrl}/test-videolify?room=${TEST_CONFIG.room}&name=${TEST_CONFIG.tutorName}`);
    await sleep(3000);
    
    // Wait for connection
    await tutorPage.waitForSelector('[data-testid="connection-status-dot"]', { timeout: TEST_CONFIG.timeout });
    console.log('   ✅ Tutor: Page loaded');

    // ============================================
    // 2. STUDENT: Join with blocked camera
    // ============================================
    console.log('\n🟩 STEP 2: Student joins with BLOCKED camera');
    const studentContext = await browser.newContext({
      permissions: [] // No permissions → getUserMedia will fail
    });
    const studentPage = await studentContext.newPage();
    
    // Mock getUserMedia to fail
    await studentPage.addInitScript(() => {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = function(constraints) {
        console.log('🔒 [BLOCKED] getUserMedia called with:', constraints);
        return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      };
    });
    
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/test-videolify?room=${TEST_CONFIG.room}&name=${TEST_CONFIG.studentName}`);
    await sleep(5000); // Wait for VBG timeout + dummy track creation
    
    console.log('   ✅ Student: Page loaded with dummy tracks');

    // ============================================
    // 3. WAIT FOR CONNECTION
    // ============================================
    console.log('\n🔗 STEP 3: Waiting for P2P connection...');
    
    // Wait for tutor to see student connected
    const tutorConnected = await tutorPage.waitForSelector('[data-testid="connection-status-dot"][style*="rgb(34, 197, 94)"]', { 
      timeout: TEST_CONFIG.timeout 
    }).then(() => true).catch(() => false);
    
    if (!tutorConnected) {
      console.error('   ❌ Tutor: Connection failed');
      throw new Error('Connection failed');
    }
    
    console.log('   ✅ Tutor: Connected (green dot)');
    
    // Check tutor sees "Camera tắt" overlay
    const tutorOverlay = await tutorPage.locator('text=Camera tắt').count();
    console.log(`   ${tutorOverlay > 0 ? '✅' : '❌'} Tutor: Sees "Camera tắt" overlay (${tutorOverlay})`);

    // ============================================
    // 4. STUDENT: START SCREEN SHARE
    // ============================================
    console.log('\n📺 STEP 4: Student starts screen share...');
    
    // Mock getDisplayMedia to auto-grant
    await studentPage.evaluate(() => {
      // Create fake screen stream
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000'; // Red screen
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.fillText('🖥️ SCREEN SHARE TEST', 600, 540);
      }
      const fakeScreenStream = canvas.captureStream(15);
      
      // Mock getDisplayMedia
      navigator.mediaDevices.getDisplayMedia = function() {
        console.log('🖥️ [MOCK] getDisplayMedia called');
        return Promise.resolve(fakeScreenStream);
      };
    });
    
    // Click screen share button
    const shareButton = studentPage.locator('[data-testid="screen-share-button"]');
    if (await shareButton.count() === 0) {
      console.error('   ❌ Student: Screen share button not found');
      throw new Error('Screen share button not found');
    }
    
    await shareButton.click();
    await sleep(2000);
    
    console.log('   ✅ Student: Screen share started');

    // ============================================
    // 5. VERIFY TUTOR SEES SCREEN
    // ============================================
    console.log('\n👁️ STEP 5: Verify tutor sees screen...');
    
    // Check remote video playing
    const tutorRemoteVideo = await tutorPage.evaluate(() => {
      const video = document.querySelector('[data-testid="remote-video"]');
      return {
        exists: !!video,
        playing: video && !video.paused && video.readyState >= 2,
        width: video?.videoWidth || 0,
        height: video?.videoHeight || 0
      };
    });
    
    console.log('   🎥 Tutor remote video:', tutorRemoteVideo);
    
    if (!tutorRemoteVideo.playing) {
      console.error('   ❌ Tutor: Remote video NOT playing');
    } else {
      console.log('   ✅ Tutor: Sees student\'s screen');
    }

    // Check "Camera tắt" overlay should DISAPPEAR (because student is sharing screen)
    const tutorOverlayAfterShare = await tutorPage.locator('text=Camera tắt').count();
    console.log(`   ${tutorOverlayAfterShare === 0 ? '✅' : '⚠️'} Tutor: "Camera tắt" overlay status (${tutorOverlayAfterShare})`);

    // ============================================
    // 6. STUDENT: STOP SCREEN SHARE
    // ============================================
    console.log('\n🛑 STEP 6: Student stops screen share...');
    
    await shareButton.click();
    await sleep(2000);
    
    console.log('   ✅ Student: Screen share stopped');

    // ============================================
    // 7. VERIFY CONNECTION STILL STABLE
    // ============================================
    console.log('\n🔍 STEP 7: Verify connection still stable...');
    
    // Check connection still green
    const stillConnected = await tutorPage.locator('[data-testid="connection-status-dot"][style*="rgb(34, 197, 94)"]').count();
    console.log(`   ${stillConnected > 0 ? '✅' : '❌'} Tutor: Connection still active (${stillConnected})`);
    
    // Check "Camera tắt" overlay should REAPPEAR
    await sleep(1000); // Wait for state update
    const tutorOverlayAfterStop = await tutorPage.locator('text=Camera tắt').count();
    console.log(`   ${tutorOverlayAfterStop > 0 ? '✅' : '❌'} Tutor: "Camera tắt" overlay reappears (${tutorOverlayAfterStop})`);

    // ============================================
    // FINAL VERDICT
    // ============================================
    console.log('\n' + '='.repeat(50));
    
    const allPass = tutorConnected && 
                    tutorRemoteVideo.playing && 
                    stillConnected > 0 &&
                    tutorOverlay > 0 &&
                    tutorOverlayAfterStop > 0;
    
    if (allPass) {
      console.log('✅ ALL TESTS PASSED - Screen share works with blocked camera!');
      console.log('   ✅ Connection established with dummy tracks');
      console.log('   ✅ Screen share started successfully');
      console.log('   ✅ Tutor saw student\'s screen');
      console.log('   ✅ Connection stable after stopping share');
      console.log('   ✅ "Camera tắt" overlay shows correctly');
    } else {
      console.log('❌ TEST FAILED - Screen share has issues!');
      console.log('Issues:');
      if (!tutorConnected) console.log('   ❌ Connection failed');
      if (!tutorRemoteVideo.playing) console.log('   ❌ Tutor cannot see screen');
      if (stillConnected === 0) console.log('   ❌ Connection lost after stopping share');
      if (tutorOverlay === 0) console.log('   ❌ Overlay not showing initially');
      if (tutorOverlayAfterStop === 0) console.log('   ❌ Overlay not showing after stop');
    }
    
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await sleep(2000);
    await browser.close();
  }
}

main();
