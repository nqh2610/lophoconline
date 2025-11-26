import puppeteer from 'puppeteer';

console.log('🧪 Testing Permission Denial Handling...\n');

const TEST_URL = 'http://localhost:3000/test-videolify';
const ROOM_NAME = 'test-permission-room';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testPermissionDenial() {
  let browser1, browser2;
  
  try {
    // Launch browser 1 (Student) - DENY permissions
    console.log('🚀 Launching Student browser (permissions DENIED)...');
    browser1 = await puppeteer.launch({
      headless: false,
      args: ['--use-fake-ui-for-media-stream=0'] // Don't auto-grant
    });
    
    const context1 = await browser1.createBrowserContext();
    
    // CRITICAL: Block camera and microphone permissions
    await context1.overridePermissions(TEST_URL, []);
    
    const page1 = await context1.newPage();
    
    // Listen for console messages to verify behavior
    const page1Logs = [];
    page1.on('console', msg => {
      const text = msg.text();
      page1Logs.push(text);
      console.log(`📱 [Student] ${text}`);
    });
    
    await page1.goto(`${TEST_URL}?room=${ROOM_NAME}&testUserId=1&name=Student&role=student`);
    await sleep(3000);
    
    // Launch browser 2 (Tutor) - GRANT permissions
    console.log('\n🚀 Launching Tutor browser (permissions GRANTED)...');
    browser2 = await puppeteer.launch({
      headless: false,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });
    
    const page2 = await browser2.newPage();
    
    const page2Logs = [];
    page2.on('console', msg => {
      const text = msg.text();
      page2Logs.push(text);
      console.log(`👨‍🏫 [Tutor] ${text}`);
    });
    
    await page2.goto(`${TEST_URL}?room=${ROOM_NAME}&testUserId=2&name=Tutor&role=tutor`);
    await sleep(3000);
    
    console.log('\n⏳ Waiting for connection...');
    await sleep(5000);
    
    // TEST 1: Check Student's initial state (should have dummy tracks)
    console.log('\n📋 TEST 1: Verify Student has dummy tracks...');
    const studentVideoTrack = await page1.evaluate(() => {
      const localStream = window.localStreamRef?.current;
      const videoTrack = localStream?.getVideoTracks()[0];
      return {
        exists: !!videoTrack,
        label: videoTrack?.label || 'no-label',
        enabled: videoTrack?.enabled,
      };
    });
    
    console.log('Student video track:', studentVideoTrack);
    
    if (studentVideoTrack.label.includes('canvas')) {
      console.log('✅ PASS: Student has dummy canvas track (as expected)');
    } else {
      console.log('❌ FAIL: Student should have canvas dummy track');
    }
    
    // TEST 2: Click camera toggle on Student side (should fail and set state to OFF)
    console.log('\n📋 TEST 2: Student clicks camera toggle (should fail)...');
    
    // Clear previous logs
    page1Logs.length = 0;
    
    // Click the camera button
    await page1.evaluate(() => {
      const cameraBtn = document.querySelector('[data-testid="camera-toggle"]') || 
                        document.querySelector('button[class*="camera"]') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.includes('📹') || btn.querySelector('svg')
                        );
      if (cameraBtn) {
        cameraBtn.click();
        console.log('Clicked camera toggle button');
      } else {
        console.log('Camera button not found, calling toggleVideo directly');
        window.toggleVideo?.();
      }
    });
    
    await sleep(2000);
    
    // Check if error toast appeared
    const hasErrorToast = await page1.evaluate(() => {
      const toasts = document.querySelectorAll('[role="alert"], [class*="toast"]');
      return Array.from(toasts).some(toast => 
        toast.textContent.includes('Quyền camera bị từ chối') ||
        toast.textContent.includes('Permission denied')
      );
    });
    
    if (hasErrorToast) {
      console.log('✅ PASS: Error toast shown "Quyền camera bị từ chối"');
    } else {
      console.log('❌ FAIL: No error toast found (should show permission denied)');
    }
    
    // Check if video is marked as OFF
    const isVideoEnabled = await page1.evaluate(() => {
      return window.isVideoEnabledRef?.current || false;
    });
    
    if (!isVideoEnabled) {
      console.log('✅ PASS: isVideoEnabled = false (correct state)');
    } else {
      console.log('❌ FAIL: isVideoEnabled should be false after permission denial');
    }
    
    // TEST 3: Check if Tutor sees "Camera tắt" overlay on Student's video
    console.log('\n📋 TEST 3: Check Tutor sees "Camera tắt" on Student video...');
    
    await sleep(1000);
    
    const tutorSeesOverlay = await page2.evaluate(() => {
      const remoteVideos = document.querySelectorAll('video');
      const overlays = document.querySelectorAll('[class*="overlay"], [class*="status"]');
      
      return {
        videoCount: remoteVideos.length,
        overlayTexts: Array.from(overlays).map(el => el.textContent),
        hasCameraTat: Array.from(document.querySelectorAll('*')).some(el => 
          el.textContent.includes('Camera tắt') || el.textContent.includes('Camera off')
        )
      };
    });
    
    console.log('Tutor overlay check:', tutorSeesOverlay);
    
    if (tutorSeesOverlay.hasCameraTat) {
      console.log('✅ PASS: Tutor sees "Camera tắt" overlay');
    } else {
      console.log('⚠️  WARNING: Tutor might not see "Camera tắt" overlay (check manually)');
    }
    
    // TEST 4: Check control message was sent
    console.log('\n📋 TEST 4: Verify control message "video-toggle: false" was sent...');
    
    const sentVideoToggleFalse = page1Logs.some(log => 
      log.includes('video-toggle') && log.includes('false')
    );
    
    if (sentVideoToggleFalse) {
      console.log('✅ PASS: Control message "video-toggle: false" sent to peer');
    } else {
      console.log('❌ FAIL: No control message found in logs');
      console.log('Page1 logs:', page1Logs.slice(-10));
    }
    
    // TEST 5: Test microphone toggle (same pattern)
    console.log('\n📋 TEST 5: Student clicks mic toggle (should fail)...');
    
    page1Logs.length = 0;
    
    await page1.evaluate(() => {
      const micBtn = document.querySelector('[data-testid="mic-toggle"]') ||
                     document.querySelector('button[class*="mic"]') ||
                     Array.from(document.querySelectorAll('button')).find(btn => 
                       btn.textContent.includes('🎤') || btn.querySelector('svg')
                     );
      if (micBtn) {
        micBtn.click();
      } else {
        window.toggleAudio?.();
      }
    });
    
    await sleep(2000);
    
    const hasMicErrorToast = await page1.evaluate(() => {
      const toasts = document.querySelectorAll('[role="alert"], [class*="toast"]');
      return Array.from(toasts).some(toast => 
        toast.textContent.includes('Quyền microphone bị từ chối') ||
        toast.textContent.includes('microphone')
      );
    });
    
    if (hasMicErrorToast) {
      console.log('✅ PASS: Mic error toast shown');
    } else {
      console.log('❌ FAIL: No mic error toast');
    }
    
    const isAudioEnabled = await page1.evaluate(() => {
      return window.isAudioEnabledRef?.current || false;
    });
    
    if (!isAudioEnabled) {
      console.log('✅ PASS: isAudioEnabled = false');
    } else {
      console.log('❌ FAIL: isAudioEnabled should be false');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const results = [
      { name: 'Dummy track created', pass: studentVideoTrack.label.includes('canvas') },
      { name: 'Error toast shown', pass: hasErrorToast },
      { name: 'isVideoEnabled = false', pass: !isVideoEnabled },
      { name: 'Control message sent', pass: sentVideoToggleFalse },
      { name: 'Mic error handling', pass: hasMicErrorToast && !isAudioEnabled },
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
    } else {
      console.log('⚠️  Some tests failed - review logs above');
    }
    
    console.log('\n⏳ Keeping browsers open for 30 seconds for manual inspection...');
    await sleep(30000);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
    console.log('\n✅ Test complete');
  }
}

testPermissionDenial();
