import puppeteer from 'puppeteer';

console.log('🧪 Testing Permission Denial with Chrome Incognito Mode...\n');

const TEST_URL = 'http://localhost:3000/test-videolify';
const ROOM_NAME = 'test-incognito-' + Date.now();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testIncognitoPermissions() {
  let browser1, browser2;
  
  try {
    // Launch browser 1 (Student) - INCOGNITO MODE (blocks permissions by default)
    console.log('🚀 Launching Student browser in INCOGNITO mode (permissions BLOCKED)...');
    browser1 = await puppeteer.launch({
      headless: false,
      args: [
        '--incognito', // CRITICAL: Incognito mode blocks permissions
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    const context1 = browser1.defaultBrowserContext();
    const page1 = await context1.newPage();
    
    // Listen for console messages
    const page1Logs = [];
    page1.on('console', msg => {
      const text = msg.text();
      page1Logs.push(text);
      if (text.includes('[Videolify]') || text.includes('camera') || text.includes('Quyền') || text.includes('video-toggle')) {
        console.log(`📱 [Student-Incognito] ${text}`);
      }
    });
    
    console.log('📱 Opening Student page...');
    await page1.goto(`${TEST_URL}?room=${ROOM_NAME}&testUserId=1&name=Student&role=student`, {
      waitUntil: 'domcontentloaded'
    });
    
    console.log('⏳ Waiting for Student to handle permission denial...');
    await sleep(8000);
    
    // Launch browser 2 (Tutor) - NORMAL MODE with fake devices (grants permissions)
    console.log('\n🚀 Launching Tutor browser in NORMAL mode (permissions GRANTED)...');
    browser2 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream', // Auto-grant
        '--use-fake-device-for-media-stream',
        '--no-sandbox'
      ]
    });
    
    const page2 = await browser2.newPage();
    
    const page2Logs = [];
    page2.on('console', msg => {
      const text = msg.text();
      page2Logs.push(text);
      if (text.includes('[Videolify]') || text.includes('Camera') || text.includes('video-toggle')) {
        console.log(`👨‍🏫 [Tutor-Normal] ${text}`);
      }
    });
    
    console.log('👨‍🏫 Opening Tutor page...');
    await page2.goto(`${TEST_URL}?room=${ROOM_NAME}&testUserId=2&name=Tutor&role=tutor`, {
      waitUntil: 'domcontentloaded'
    });
    
    console.log('\n⏳ Waiting for P2P connection...');
    await sleep(10000);
    
    // TEST 1: Check if Student has dummy tracks (from permission denial)
    console.log('\n📋 TEST 1: Verify Student is using dummy tracks after incognito denial...');
    
    const hasPermissionError = page1Logs.some(log => 
      log.includes('Could not access camera/mic') ||
      log.includes('NotAllowedError') ||
      log.includes('Permission denied')
    );
    
    const hasDummyTracks = page1Logs.some(log =>
      log.includes('Added silent audio track') && log.includes('Added blank video track')
    );
    
    if (hasPermissionError) {
      console.log('✅ PASS: Student got permission denial error');
    } else {
      console.log('❌ FAIL: No permission error detected');
    }
    
    if (hasDummyTracks) {
      console.log('✅ PASS: Dummy tracks created (silent audio + blank video)');
    } else {
      console.log('❌ FAIL: Dummy tracks not created');
    }
    
    // TEST 2: Click camera toggle on Student - should show error
    console.log('\n📋 TEST 2: Student clicks camera toggle (should fail with error toast)...');
    
    page1Logs.length = 0; // Clear logs
    
    // Take screenshot before clicking
    await page1.screenshot({ path: 'test-before-toggle.png' });
    console.log('📸 Screenshot saved: test-before-toggle.png');
    
    // Click camera button
    await page1.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Find camera toggle button (look for video/camera icon)
      const cameraBtn = buttons.find(btn => {
        const btnText = btn.textContent.toLowerCase();
        const btnHTML = btn.innerHTML.toLowerCase();
        return btnHTML.includes('video') || 
               btnHTML.includes('camera') ||
               btnHTML.includes('m23') || // Common camera SVG path
               btn.querySelector('svg path[d*="M23"]'); // Camera icon path
      });
      
      if (cameraBtn) {
        console.log('[TEST] Clicking camera button...');
        cameraBtn.click();
        return 'clicked';
      } else {
        console.log('[TEST] Camera button not found, buttons:', buttons.length);
        return 'not-found';
      }
    });
    
    await sleep(4000);
    
    // Take screenshot after clicking
    await page1.screenshot({ path: 'test-after-toggle.png' });
    console.log('📸 Screenshot saved: test-after-toggle.png');
    
    // Check for error toast in logs
    const hasErrorToast = page1Logs.some(log =>
      log.includes('Quyền camera bị từ chối') ||
      log.includes('Permission denied') ||
      log.includes('NotAllowedError')
    );
    
    // Check if control message sent
    const sentVideoToggleFalse = page1Logs.some(log =>
      log.includes('Sent video-toggle') && log.includes('false')
    );
    
    if (hasErrorToast) {
      console.log('✅ PASS: Error toast/log detected');
    } else {
      console.log('⚠️  WARNING: No error toast/log found');
      console.log('Recent logs:', page1Logs.slice(-5));
    }
    
    if (sentVideoToggleFalse) {
      console.log('✅ PASS: Control message "video-toggle: false" sent to peer');
    } else {
      console.log('⚠️  WARNING: No "video-toggle: false" message found');
      console.log('Control logs:', page1Logs.filter(l => l.includes('video-toggle')));
    }
    
    // TEST 3: Check if Tutor sees proper state
    console.log('\n📋 TEST 3: Check Tutor received "video-toggle: false" message...');
    
    await sleep(2000);
    
    const tutorReceivedToggleFalse = page2Logs.some(log =>
      (log.includes('video-toggle') && log.includes('false')) ||
      log.includes('Remote track muted: video')
    );
    
    if (tutorReceivedToggleFalse) {
      console.log('✅ PASS: Tutor received video OFF state');
    } else {
      console.log('⚠️  WARNING: Tutor may not have received OFF state');
      console.log('Tutor video logs:', page2Logs.filter(l => l.includes('video') || l.includes('toggle')));
    }
    
    // TEST 4: Test microphone toggle
    console.log('\n📋 TEST 4: Student clicks mic toggle (should also fail)...');
    
    page1Logs.length = 0;
    
    await page1.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const micBtn = buttons.find(btn => {
        const btnHTML = btn.innerHTML.toLowerCase();
        return btnHTML.includes('mic') || 
               btnHTML.includes('audio') ||
               btn.querySelector('svg path[d*="M12"]'); // Mic icon path
      });
      
      if (micBtn) {
        console.log('[TEST] Clicking mic button...');
        micBtn.click();
      } else {
        console.log('[TEST] Mic button not found');
      }
    });
    
    await sleep(3000);
    
    const hasMicError = page1Logs.some(log =>
      log.includes('Quyền microphone bị từ chối') ||
      log.includes('microphone') ||
      log.includes('NotAllowedError')
    );
    
    const sentAudioToggleFalse = page1Logs.some(log =>
      log.includes('Sent audio-toggle') && log.includes('false')
    );
    
    if (hasMicError) {
      console.log('✅ PASS: Mic error detected');
    } else {
      console.log('⚠️  WARNING: No mic error found');
    }
    
    if (sentAudioToggleFalse) {
      console.log('✅ PASS: Audio toggle false sent');
    } else {
      console.log('⚠️  WARNING: No audio toggle message');
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY - Chrome Incognito Permission Denial');
    console.log('='.repeat(70));
    
    const results = [
      { name: 'Permission denial detected', pass: hasPermissionError },
      { name: 'Dummy tracks created', pass: hasDummyTracks },
      { name: 'Camera toggle error handling', pass: hasErrorToast || sentVideoToggleFalse },
      { name: 'Video-toggle:false sent', pass: sentVideoToggleFalse },
      { name: 'Tutor received OFF state', pass: tutorReceivedToggleFalse },
      { name: 'Mic toggle error handling', pass: hasMicError || sentAudioToggleFalse },
    ];
    
    results.forEach(({ name, pass }) => {
      console.log(`${pass ? '✅' : '⚠️ '} ${name}`);
    });
    
    const passCount = results.filter(r => r.pass).length;
    const totalCount = results.length;
    const passRate = (passCount / totalCount * 100).toFixed(0);
    
    console.log(`\n📈 Pass Rate: ${passCount}/${totalCount} (${passRate}%)`);
    
    if (passCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED!');
    } else if (passCount >= totalCount * 0.7) {
      console.log('✅ GOOD - Most tests passed (≥70%)');
    } else {
      console.log('⚠️  NEEDS REVIEW - Some tests failed');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📸 MANUAL VERIFICATION:');
    console.log('   1. Check test-before-toggle.png - Student should have blank/dummy video');
    console.log('   2. Check test-after-toggle.png - Should show error toast');
    console.log('   3. Check Tutor browser - Should see "Camera tắt" on Student video');
    console.log('='.repeat(70));
    
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

testIncognitoPermissions();
