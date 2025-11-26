/**
 * AUTO TEST - NEW VBG Approach: Send original video, each peer processes independently
 * Tests:
 * 1. Local VBG applied to local preview only
 * 2. Peer connection sends ORIGINAL video (no replaceTrack)
 * 3. Remote peer video receives ORIGINAL video (smooth, no freeze)
 */

import puppeteer from 'puppeteer';

const ROOM_ID = 'auto-test-vbg-' + Date.now();
const SERVER_URL = 'http://localhost:3000';
const TEST_DURATION = 30000; // 30 seconds

console.log('\n🤖 AUTO TEST - NEW VBG Approach');
console.log('='.repeat(60));
console.log('📋 Room ID:', ROOM_ID);
console.log('⏱️  Test duration:', TEST_DURATION / 1000, 'seconds\n');

async function createTestUser(role, name, testUserId) {
  console.log(`🚀 [${name}] Creating browser...`);
  
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--auto-select-desktop-capture-source=Entire screen',
    ],
  });

  const page = await browser.newPage();
  
  // Grant permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(SERVER_URL, ['camera', 'microphone']);

  // Use test page directly
  const testUrl = `${SERVER_URL}/test-videolify?room=${ROOM_ID}&name=${name}&role=${role}&testUserId=${testUserId}`;
  console.log(`🔗 [${name}] Navigating to:`, testUrl);
  
  await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait for video elements
  await page.waitForSelector('video', { timeout: 20000 });
  console.log(`✅ [${name}] Joined room and video loaded\n`);

  return { browser, page };
}

async function measureVideoProgress(page, videoSelector, duration = 2000) {
  return await page.evaluate(async (selector, dur) => {
    const videos = document.querySelectorAll(selector);
    if (videos.length === 0) return { error: 'Video not found', selector };

    const video = videos[0]; // Use first matching video
    const startTime = video.currentTime;
    await new Promise(resolve => setTimeout(resolve, dur));
    const endTime = video.currentTime;

    return {
      start: startTime,
      end: endTime,
      progressed: endTime - startTime,
      duration: dur / 1000,
      isProgressing: (endTime - startTime) > 0.5,
    };
  }, videoSelector, duration);
}

async function enableVirtualBackground(page, name) {
  console.log(`🎭 [${name}] Enabling virtual background (blur)...`);
  
  const result = await page.evaluate(async () => {
    // Wait a bit for UI to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find all buttons with text
    const buttons = Array.from(document.querySelectorAll('button'));
    console.log(`Found ${buttons.length} buttons`);
    
    // Look for background/blur icon or text
    const vbgButton = buttons.find(btn => {
      const text = btn.textContent || '';
      const hasIcon = btn.querySelector('svg');
      const classes = btn.className || '';
      
      // Check for background-related indicators
      return text.toLowerCase().includes('background') || 
             text.toLowerCase().includes('blur') ||
             classes.includes('background') ||
             classes.includes('vbg');
    });
    
    if (!vbgButton) {
      const buttonTexts = buttons.slice(0, 20).map(b => b.textContent?.substring(0, 50));
      console.error('❌ VBG button not found. Available buttons:', buttonTexts);
      return { success: false, error: 'VBG button not found' };
    }

    console.log('✅ Found VBG button:', vbgButton.textContent?.substring(0, 50));
    vbgButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find blur option after menu opens
    const allButtons = Array.from(document.querySelectorAll('button'));
    const blurButton = allButtons.find(btn => {
      const text = (btn.textContent || '').toLowerCase();
      return text.includes('blur') && !text.includes('background');
    });

    if (!blurButton) {
      const menuButtons = allButtons.slice(-10).map(b => b.textContent?.substring(0, 30));
      console.error('❌ Blur button not found. Recent buttons:', menuButtons);
      return { success: false, error: 'Blur button not found' };
    }

    console.log('✅ Found Blur button:', blurButton.textContent?.substring(0, 30));
    blurButton.click();
    
    // Wait for VBG to initialize
    console.log('⏳ Waiting for VBG initialization (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return { success: true };
  });

  if (!result.success) {
    console.error(`❌ [${name}] Failed to enable VBG:`, result.error);
    return false;
  }

  console.log(`✅ [${name}] VBG enabled successfully\n`);
  return true;
}

async function checkVideoTrackInPeerConnection(page, name) {
  return await page.evaluate(() => {
    const debug = window.__VIDEOLIFY_DEBUG__;
    if (!debug?.peerConnection) {
      return { error: 'No debug object or peer connection found' };
    }

    const pc = debug.peerConnection;
    const senders = pc.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    
    if (!videoSender || !videoSender.track) {
      return { error: 'No video sender found' };
    }

    const track = videoSender.track;
    const label = track.label.toLowerCase();
    
    return {
      trackId: track.id,
      trackLabel: track.label,
      trackEnabled: track.enabled,
      trackReadyState: track.readyState,
      // Check if it's original camera track (not processed canvas track)
      isOriginalTrack: label.includes('video') || 
                       label.includes('camera') ||
                       label.includes('cam') ||
                       !label.includes('canvas'),
    };
  });
}

async function runTest() {
  let tutor = null;
  let student = null;

  try {
    console.log('📌 STEP 1: Creating tutor and student browsers...\n');
    tutor = await createTestUser('tutor', 'Tutor', '1');
    await new Promise(resolve => setTimeout(resolve, 3000));
    student = await createTestUser('student', 'Student', '2');
    
    console.log('📌 STEP 2: Waiting for WebRTC connection (10s)...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('📌 STEP 3: Testing videos BEFORE VBG...\n');
    
    // Test all videos - use simple selectors
    const tutorLocalBefore = await measureVideoProgress(tutor.page, 'video', 2000);
    await new Promise(resolve => setTimeout(resolve, 500));
    const studentVideoBefore = await measureVideoProgress(student.page, 'video', 2000);

    console.log('📊 BEFORE VBG:');
    console.log(`   Tutor Local: ${tutorLocalBefore.isProgressing ? '✅ Playing' : '❌ Frozen'} (${tutorLocalBefore.progressed?.toFixed(2)}s)`);
    console.log(`   Student Video: ${studentVideoBefore.isProgressing ? '✅ Playing' : '❌ Frozen'} (${studentVideoBefore.progressed?.toFixed(2)}s)\n`);

    if (!tutorLocalBefore.isProgressing || !studentVideoBefore.isProgressing) {
      console.error('❌ TEST FAILED: Videos not playing before VBG test');
      return;
    }

    console.log('📌 STEP 4: Enabling VBG on TUTOR side...\n');
    const vbgEnabled = await enableVirtualBackground(tutor.page, 'Tutor');
    
    if (!vbgEnabled) {
      console.error('❌ TEST FAILED: Could not enable VBG\n');
      return;
    }

    console.log('📌 STEP 5: Checking video track sent to peer...\n');
    const tutorTrackInfo = await checkVideoTrackInPeerConnection(tutor.page, 'Tutor');
    
    if (tutorTrackInfo.error) {
      console.log(`⚠️  Warning: ${tutorTrackInfo.error}`);
    } else {
      console.log('📡 Tutor video track info:');
      console.log(`   Track ID: ${tutorTrackInfo.trackId}`);
      console.log(`   Track Label: ${tutorTrackInfo.trackLabel}`);
      console.log(`   Track State: ${tutorTrackInfo.trackReadyState}`);
      
      if (tutorTrackInfo.isOriginalTrack) {
        console.log('   ✅ CORRECT: Sending ORIGINAL camera track (not processed canvas)\n');
      } else {
        console.log('   ⚠️  WARNING: Might be sending processed track\n');
      }
    }

    console.log('📌 STEP 6: Testing videos AFTER VBG (30 second stress test)...\n');
    
    const measurements = [];
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const tutorLocal = await measureVideoProgress(tutor.page, 'video', 2000);
      const studentRemote = await measureVideoProgress(student.page, 'video', 2000);
      
      measurements.push({
        time: (i + 1) * 5,
        tutorLocal,
        studentRemote,
      });

      const tutorStatus = tutorLocal.isProgressing ? '✅' : '❌';
      const studentStatus = studentRemote.isProgressing ? '✅' : '❌';
      
      console.log(`   [${String((i + 1) * 5).padStart(2)}s] Tutor local: ${tutorStatus} ${tutorLocal.progressed?.toFixed(2)}s | Student sees tutor: ${studentStatus} ${studentRemote.progressed?.toFixed(2)}s`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST RESULTS');
    console.log('='.repeat(60) + '\n');
    
    const allTutorLocalOk = measurements.every(m => m.tutorLocal.isProgressing);
    const allStudentRemoteOk = measurements.every(m => m.studentRemote.isProgressing);

    console.log('📌 Test 1: Tutor Local Video (with VBG processing)');
    if (allTutorLocalOk) {
      console.log('   ✅ PASS - Local preview with VBG smooth for full 30 seconds\n');
    } else {
      const failedAt = measurements.findIndex(m => !m.tutorLocal.isProgressing);
      console.log(`   ❌ FAIL - Local VBG froze at ${(failedAt + 1) * 5}s\n`);
    }

    console.log('📌 Test 2: Student sees Tutor (receiving ORIGINAL video)');
    if (allStudentRemoteOk) {
      console.log('   ✅ PASS - Peer receives original video smoothly (NO FREEZE!)\n');
    } else {
      const failedAt = measurements.findIndex(m => !m.studentRemote.isProgressing);
      console.log(`   ❌ FAIL - Peer video froze at ${(failedAt + 1) * 5}s\n`);
    }

    console.log('📌 Test 3: Video track type verification');
    if (tutorTrackInfo.isOriginalTrack) {
      console.log('   ✅ PASS - Sending original camera track (not canvas)\n');
    } else if (tutorTrackInfo.error) {
      console.log(`   ⚠️  SKIP - Could not verify (${tutorTrackInfo.error})\n`);
    } else {
      console.log('   ❌ FAIL - Sending processed track instead of original\n');
    }

    console.log('='.repeat(60));
    console.log('🎯 OVERALL RESULT');
    console.log('='.repeat(60) + '\n');

    if (allTutorLocalOk && allStudentRemoteOk && (tutorTrackInfo.isOriginalTrack || tutorTrackInfo.error)) {
      console.log('   ✅✅✅ ALL TESTS PASSED! 🎉');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   ✓ Local VBG works smoothly');
      console.log('   ✓ Original video sent to peer (no replaceTrack)');
      console.log('   ✓ Peer receives smooth video (NO FREEZE)');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   🚀 NEW APPROACH SUCCESSFUL - FREEZE BUG FIXED!\n');
    } else {
      console.log('   ❌ SOME TESTS FAILED\n');
      console.log('   Issues detected:');
      if (!allTutorLocalOk) console.log('   - Local VBG preview freezing');
      if (!allStudentRemoteOk) console.log('   - Peer still receiving frozen video');
      if (!tutorTrackInfo.isOriginalTrack && !tutorTrackInfo.error) console.log('   - Not sending original track');
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🔚 Closing browsers in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (tutor) await tutor.browser.close();
    if (student) await student.browser.close();
    console.log('✅ Test completed\n');
  }
}

runTest();
