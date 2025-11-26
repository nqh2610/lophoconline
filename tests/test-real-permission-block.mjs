import puppeteer from 'puppeteer';

console.log('🧪 Testing REAL Permission Block Scenario...\n');

const TEST_URL = 'http://localhost:3000/test-videolify';
const ROOM_NAME = 'block-test-' + Date.now();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testPermissionBlock() {
  let browser1, browser2, context1;
  
  try {
    console.log('='.repeat(70));
    console.log('📋 TEST SCENARIO:');
    console.log('1. Student browser: BLOCK permissions (simulated)');
    console.log('2. Tutor browser: ALLOW permissions');
    console.log('3. Verify 3 issues:');
    console.log('   a) Local video shows "Camera tắt" overlay');
    console.log('   b) Remote video shows "Camera tắt" overlay');
    console.log('   c) Toast shows permission error (NOT "Camera đã bật")');
    console.log('='.repeat(70) + '\n');
    
    // Browser 1: Student với permissions BLOCKED via mock
    console.log('🚀 Launching Student browser...');
    browser1 = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    context1 = await browser1.createBrowserContext();
    const page1 = await context1.newPage();
    
    // MOCK getUserMedia to throw NotAllowedError
    await page1.evaluateOnNewDocument(() => {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        console.log('[MOCK] getUserMedia called with:', constraints);
        // Throw permission error
        const err = new Error('Permission denied');
        err.name = 'NotAllowedError';
        throw err;
      };
    });
    
    const logs1 = [];
    page1.on('console', msg => {
      const text = msg.text();
      logs1.push(text);
      if (text.includes('[Videolify]') || text.includes('MOCK') || text.includes('camera') || text.includes('Quyền')) {
        console.log(`📱 [Student] ${text.substring(0, 100)}`);
      }
    });
    
    console.log('📱 Student: Opening page...');
    await page1.goto(`${TEST_URL}?room=${ROOM_NAME}&testUserId=1&name=Student&role=student`, {
      waitUntil: 'domcontentloaded'
    });
    
    await sleep(6000);
    
    // Browser 2: Tutor với permissions ALLOWED
    console.log('\n🚀 Launching Tutor browser...');
    browser2 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox'
      ]
    });
    
    const page2 = await browser2.newPage();
    
    const logs2 = [];
    page2.on('console', msg => {
      const text = msg.text();
      logs2.push(text);
      if (text.includes('[Videolify]') || text.includes('Camera') || text.includes('video-toggle')) {
        console.log(`👨‍🏫 [Tutor] ${text.substring(0, 100)}`);
      }
    });
    
    console.log('👨‍🏫 Tutor: Opening page...');
    await page2.goto(`${TEST_URL}?room=${ROOM_NAME}&testUserId=2&name=Tutor&role=tutor`, {
      waitUntil: 'domcontentloaded'
    });
    
    console.log('\n⏳ Waiting for P2P connection...');
    await sleep(10000);
    
    // TEST 1: Verify Student created dummy tracks
    console.log('\n📋 TEST 1: Check if Student has dummy tracks...');
    const hasPermissionError = logs1.some(l => 
      l.includes('Could not access camera/mic') || l.includes('NotAllowedError')
    );
    const hasDummyTracks = logs1.some(l => 
      l.includes('Added silent audio track') && l.includes('Added blank video track')
    );
    
    console.log(hasPermissionError ? '✅ Permission error detected' : '❌ No permission error');
    console.log(hasDummyTracks ? '✅ Dummy tracks created' : '❌ No dummy tracks');
    
    // TEST 2: Check if remote video overlay appears on Tutor side
    console.log('\n📋 TEST 2: Check Tutor sees "Camera tắt" overlay...');
    
    await sleep(2000);
    
    const tutorOverlay = await page2.evaluate(() => {
      // Look for "Camera tắt" or "Camera đã tắt" text
      const allText = document.body.innerText;
      const hasCameraOff = allText.includes('Camera tắt') || allText.includes('Camera đã tắt');
      
      // Check if remote video is actually showing or hidden
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      const remoteVideoVisible = remoteVideo && window.getComputedStyle(remoteVideo).display !== 'none';
      
      return {
        hasCameraOffText: hasCameraOff,
        remoteVideoVisible,
        bodyText: allText.substring(0, 200)
      };
    });
    
    console.log('Tutor overlay state:', tutorOverlay);
    console.log(tutorOverlay.hasCameraOffText ? '✅ "Camera tắt" text found' : '❌ NO "Camera tắt" text');
    console.log(!tutorOverlay.remoteVideoVisible ? '✅ Remote video hidden (correct)' : '⚠️  Remote video showing (should be hidden)');
    
    // TEST 3: Check if Student shows local "Camera tắt" overlay
    console.log('\n📋 TEST 3: Check Student shows local "Camera tắt" overlay...');
    
    const studentOverlay = await page1.evaluate(() => {
      const allText = document.body.innerText;
      const hasCameraOff = allText.includes('Camera tắt');
      
      // Check local video
      const localVideo = document.querySelector('[data-testid="local-video"]');
      const localVideoVisible = localVideo && window.getComputedStyle(localVideo).display !== 'none';
      
      return {
        hasCameraOffText: hasCameraOff,
        localVideoVisible,
      };
    });
    
    console.log('Student overlay state:', studentOverlay);
    console.log(studentOverlay.hasCameraOffText ? '✅ "Camera tắt" text found' : '❌ NO "Camera tắt" text');
    
    // TEST 4: Click Student camera toggle → Should show error toast
    console.log('\n📋 TEST 4: Student clicks camera toggle...');
    
    logs1.length = 0; // Clear
    
    await page1.screenshot({ path: 'test-before-click.png' });
    console.log('📸 Screenshot: test-before-click.png');
    
    await page1.evaluate(() => {
      // Find camera button
      const buttons = Array.from(document.querySelectorAll('button'));
      const cameraBtn = buttons.find(b => {
        const html = b.innerHTML.toLowerCase();
        return html.includes('video') || html.includes('camera') || b.querySelector('svg path[d*="M23"]');
      });
      
      if (cameraBtn) {
        console.log('[TEST] Clicking camera button');
        cameraBtn.click();
      } else {
        console.log('[TEST] Camera button not found');
      }
    });
    
    await sleep(3000);
    
    await page1.screenshot({ path: 'test-after-click.png' });
    console.log('📸 Screenshot: test-after-click.png');
    
    const hasErrorInLogs = logs1.some(l => 
      l.includes('Quyền camera bị từ chối') || 
      l.includes('NotAllowedError') ||
      l.includes('Failed to access camera')
    );
    
    const hasSuccessToast = logs1.some(l => l.includes('Camera đã bật'));
    
    console.log(hasErrorInLogs ? '✅ Error logged' : '❌ No error log');
    console.log(!hasSuccessToast ? '✅ No success toast (correct)' : '❌ WRONG: Success toast shown!');
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(70));
    
    const results = [
      { name: 'Permission denial detected', pass: hasPermissionError },
      { name: 'Dummy tracks created', pass: hasDummyTracks },
      { name: 'Tutor sees "Camera tắt" overlay', pass: tutorOverlay.hasCameraOffText },
      { name: 'Remote video hidden on Tutor', pass: !tutorOverlay.remoteVideoVisible },
      { name: 'Student shows "Camera tắt" overlay', pass: studentOverlay.hasCameraOffText },
      { name: 'Error handling on toggle click', pass: hasErrorInLogs },
      { name: 'NO wrong success toast', pass: !hasSuccessToast },
    ];
    
    results.forEach(({ name, pass }) => {
      console.log(`${pass ? '✅' : '❌'} ${name}`);
    });
    
    const passCount = results.filter(r => r.pass).length;
    const totalCount = results.length;
    
    console.log(`\n📈 PASS RATE: ${passCount}/${totalCount} (${(passCount/totalCount*100).toFixed(0)}%)`);
    
    if (passCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED! Ready to commit.');
    } else {
      console.log('❌ FAILED - Do NOT commit. Fix issues first.');
    }
    
    console.log('\n⏳ Keeping browsers open for 30s for manual inspection...');
    await sleep(30000);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
    console.log('\n✅ Test complete');
  }
}

testPermissionBlock();
