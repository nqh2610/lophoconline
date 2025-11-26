import puppeteer from 'puppeteer';

console.log('🧪 Testing REAL Permission Denial with getUserMedia Mock...\n');

const TEST_URL = 'http://localhost:3000/test-videolify';
const ROOM_NAME = 'test-permission-' + Date.now();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testPermissionDenial() {
  let browser1, browser2;
  
  try {
    // Launch browser 1 (Student) - Will BLOCK permissions via mock
    console.log('🚀 Launching Student browser (permissions will be DENIED via mock)...');
    browser1 = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page1 = await browser1.newPage();
    
    // CRITICAL: Mock getUserMedia to throw NotAllowedError BEFORE page loads
    await page1.evaluateOnNewDocument(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        console.log('[MOCK] getUserMedia called - throwing NotAllowedError');
        const err = new Error('Permission denied');
        err.name = 'NotAllowedError';
        throw err;
      };
    });
    
    // Listen for console messages
    const page1Logs = [];
    page1.on('console', msg => {
      const text = msg.text();
      page1Logs.push(text);
      if (text.includes('[Videolify]') || text.includes('[MOCK]') || text.includes('video-toggle') || text.includes('Quyền')) {
        console.log(`📱 [Student] ${text}`);
      }
    });
    
    await page1.goto(`${TEST_URL}?room=${ROOM_NAME}&testUserId=1&name=Student&role=student`, {
      waitUntil: 'domcontentloaded'
    });
    
    console.log('⏳ Waiting for Student to handle permission denial...');
    await sleep(5000);
    
    // Launch browser 2 (Tutor) - GRANT permissions
    console.log('\n🚀 Launching Tutor browser (permissions GRANTED)...');
    browser2 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox'
      ]
    });
    
    const page2 = await browser2.newPage();
    
    const page2Logs = [];
    page2.on('console', msg => {
      const text = msg.text();
      page2Logs.push(text);
      if (text.includes('[Videolify]') || text.includes('video-toggle') || text.includes('Camera')) {
        console.log(`👨‍🏫 [Tutor] ${text}`);
      }
    });
    
    await page2.goto(`${TEST_URL}?room=${ROOM_NAME}&testUserId=2&name=Tutor&role=tutor`, {
      waitUntil: 'domcontentloaded'
    });
    
    console.log('\n⏳ Waiting for connection...');
    await sleep(8000);
    
    // TEST 1: Check Student's video track state
    console.log('\n📋 TEST 1: Check Student video state after permission denial...');
    const studentState = await page1.evaluate(() => {
      const localStream = window.localStreamRef?.current;
      const videoTrack = localStream?.getVideoTracks()[0];
      const audioTrack = localStream?.getAudioTracks()[0];
      
      return {
        hasVideoTrack: !!videoTrack,
        videoLabel: videoTrack?.label || 'no-video',
        hasAudioTrack: !!audioTrack,
        audioLabel: audioTrack?.label || 'no-audio',
        isVideoEnabled: window.isVideoEnabledRef?.current,
        isAudioEnabled: window.isAudioEnabledRef?.current,
        usingDummy: window.usingDummyMediaRef?.current,
      };
    });
    
    console.log('Student state:', studentState);
    
    const hasDummyVideo = studentState.videoLabel?.includes('canvas');
    const hasDummyAudio = !studentState.audioLabel || studentState.audioLabel === 'no-audio';
    
    if (hasDummyVideo) {
      console.log('✅ PASS: Student has dummy canvas video track');
    } else {
      console.log('❌ FAIL: Student should have dummy canvas track, got:', studentState.videoLabel);
    }
    
    if (studentState.usingDummy) {
      console.log('✅ PASS: usingDummyMediaRef = true');
    } else {
      console.log('❌ FAIL: usingDummyMediaRef should be true');
    }
    
    // TEST 2: Click camera toggle - should fail and set isVideoEnabled = false
    console.log('\n📋 TEST 2: Student clicks camera toggle (should fail with error toast)...');
    
    page1Logs.length = 0; // Clear logs
    
    await page1.evaluate(() => {
      // Find and click camera button
      const buttons = Array.from(document.querySelectorAll('button'));
      const cameraBtn = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        const hasVideoIcon = svg && (
          svg.querySelector('[d*="M23"]') || // Camera icon path
          svg.querySelector('[d*="camera"]') ||
          svg.innerHTML.includes('video') ||
          svg.innerHTML.includes('camera')
        );
        return hasVideoIcon;
      });
      
      if (cameraBtn) {
        console.log('[TEST] Found camera button, clicking...');
        cameraBtn.click();
      } else {
        console.log('[TEST] Camera button not found, calling toggleVideo()');
        window.toggleVideo?.();
      }
    });
    
    await sleep(3000);
    
    // Check for error toast
    const errorToastFound = await page1.evaluate(() => {
      // Check for toast with error message
      const toasts = document.querySelectorAll('[data-sonner-toast]');
      for (const toast of toasts) {
        if (toast.textContent.includes('Quyền camera bị từ chối') ||
            toast.textContent.includes('Permission denied') ||
            toast.textContent.includes('NotAllowedError')) {
          return true;
        }
      }
      return false;
    });
    
    if (errorToastFound) {
      console.log('✅ PASS: Error toast displayed with permission denied message');
    } else {
      console.log('❌ FAIL: No error toast found');
      console.log('Recent logs:', page1Logs.filter(l => l.includes('toast') || l.includes('Quyền')));
    }
    
    // Check isVideoEnabled state
    const isVideoEnabledAfterToggle = await page1.evaluate(() => {
      return window.isVideoEnabledRef?.current;
    });
    
    if (isVideoEnabledAfterToggle === false) {
      console.log('✅ PASS: isVideoEnabled = false after failed toggle');
    } else {
      console.log('❌ FAIL: isVideoEnabled should be false, got:', isVideoEnabledAfterToggle);
    }
    
    // Check if control message was sent
    const sentControlMessage = page1Logs.some(log => 
      log.includes('video-toggle') && log.includes('false')
    );
    
    if (sentControlMessage) {
      console.log('✅ PASS: Control message "video-toggle: false" sent to peer');
    } else {
      console.log('❌ FAIL: No control message found in logs');
    }
    
    // TEST 3: Check if Tutor sees "Camera tắt" overlay
    console.log('\n📋 TEST 3: Check if Tutor sees "Camera tắt" overlay...');
    
    await sleep(2000);
    
    const tutorSeesOverlay = await page2.evaluate(() => {
      // Look for camera off indicator
      const overlays = Array.from(document.querySelectorAll('div, span, p'));
      const hasCameraOff = overlays.some(el => 
        el.textContent === 'Camera tắt' || 
        el.textContent.includes('Camera off') ||
        (el.textContent.includes('Camera') && el.textContent.includes('tắt'))
      );
      
      // Check remote video state
      const remoteVideos = document.querySelectorAll('video');
      const remoteVideoPlaying = Array.from(remoteVideos).some(v => 
        v !== document.querySelector('[data-local-video]') && // Not local video
        v.srcObject && 
        v.srcObject.getVideoTracks().length > 0
      );
      
      return {
        hasCameraOffText: hasCameraOff,
        remoteVideoCount: remoteVideos.length,
        remoteVideoPlaying,
      };
    });
    
    console.log('Tutor remote state:', tutorSeesOverlay);
    
    if (tutorSeesOverlay.hasCameraOffText) {
      console.log('✅ PASS: Tutor sees "Camera tắt" overlay');
    } else {
      console.log('⚠️  WARNING: Tutor may not see "Camera tắt" overlay (check manually in browser)');
    }
    
    // TEST 4: Test microphone toggle (same pattern)
    console.log('\n📋 TEST 4: Student clicks mic toggle (should also fail)...');
    
    page1Logs.length = 0;
    
    await page1.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const micBtn = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        const hasMicIcon = svg && (
          svg.querySelector('[d*="M12"]') || // Mic icon path
          svg.querySelector('[d*="microphone"]') ||
          svg.innerHTML.includes('mic')
        );
        return hasMicIcon;
      });
      
      if (micBtn) {
        console.log('[TEST] Found mic button, clicking...');
        micBtn.click();
      } else {
        console.log('[TEST] Mic button not found, calling toggleAudio()');
        window.toggleAudio?.();
      }
    });
    
    await sleep(2000);
    
    const micErrorToast = await page1.evaluate(() => {
      const toasts = document.querySelectorAll('[data-sonner-toast]');
      for (const toast of toasts) {
        if (toast.textContent.includes('Quyền microphone bị từ chối') ||
            toast.textContent.includes('microphone')) {
          return true;
        }
      }
      return false;
    });
    
    const isAudioEnabledAfterToggle = await page1.evaluate(() => {
      return window.isAudioEnabledRef?.current;
    });
    
    if (micErrorToast) {
      console.log('✅ PASS: Mic error toast displayed');
    } else {
      console.log('❌ FAIL: No mic error toast');
    }
    
    if (isAudioEnabledAfterToggle === false) {
      console.log('✅ PASS: isAudioEnabled = false');
    } else {
      console.log('❌ FAIL: isAudioEnabled should be false');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const results = [
      { name: 'Dummy canvas track created', pass: hasDummyVideo },
      { name: 'usingDummyMediaRef = true', pass: studentState.usingDummy },
      { name: 'Camera error toast shown', pass: errorToastFound },
      { name: 'isVideoEnabled = false', pass: isVideoEnabledAfterToggle === false },
      { name: 'Control message sent', pass: sentControlMessage },
      { name: 'Mic error toast shown', pass: micErrorToast },
      { name: 'isAudioEnabled = false', pass: isAudioEnabledAfterToggle === false },
    ];
    
    results.forEach(({ name, pass }) => {
      console.log(`${pass ? '✅' : '❌'} ${name}`);
    });
    
    const passCount = results.filter(r => r.pass).length;
    const totalCount = results.length;
    const passRate = (passCount / totalCount * 100).toFixed(0);
    
    console.log(`\n📈 Pass Rate: ${passCount}/${totalCount} (${passRate}%)`);
    
    if (passCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED!');
    } else if (passCount >= totalCount * 0.7) {
      console.log('⚠️  Most tests passed - some edge cases need review');
    } else {
      console.log('❌ FAILED - Review implementation');
    }
    
    console.log('\n⏳ Keeping browsers open for 20 seconds for manual inspection...');
    console.log('   → Check Student: Should see dummy video (blank or VBG)');
    console.log('   → Check Tutor: Should see "Camera tắt" overlay on Student video');
    await sleep(20000);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
    console.log('\n✅ Test complete');
  }
}

testPermissionDenial();
