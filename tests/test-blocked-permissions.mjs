import puppeteer from 'puppeteer';

console.log('🧪 TESTING: Connection with blocked camera/mic permissions\n');

const TIMEOUT = 30000; // 30 seconds

async function testBlockedPermissions() {
  let studentBrowser, tutorBrowser;
  let studentPage, tutorPage;
  
  try {
    console.log('🚀 Launching browsers...');
    
    // Student: Block all permissions
    studentBrowser = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream', // Auto-deny permissions
        '--deny-permission-prompts', // Block permission prompts
        '--window-size=800,600',
        '--window-position=0,0'
      ]
    });
    
    // Tutor: Allow all permissions
    tutorBrowser = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--window-size=800,600',
        '--window-position=820,0'
      ]
    });

    studentPage = await studentBrowser.newPage();
    tutorPage = await tutorBrowser.newPage();

    // Grant permissions for Tutor
    const tutorContext = tutorBrowser.defaultBrowserContext();
    await tutorContext.overridePermissions('http://localhost:3000', ['camera', 'microphone']);

    // Deny permissions for Student
    const studentContext = studentBrowser.defaultBrowserContext();
    await studentContext.overridePermissions('http://localhost:3000', []);

    // Enable console logging
    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') || text.includes('Camera') || text.includes('Dummy')) {
        console.log('🟩 STUDENT:', text);
      }
    });

    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') || text.includes('Camera') || text.includes('Dummy')) {
        console.log('🟦 TUTOR:', text);
      }
    });

    const roomId = `test-blocked-${Date.now()}`;
    
    console.log(`\n📝 Room ID: ${roomId}`);
    console.log('🟩 Student: BLOCKED camera/mic');
    console.log('🟦 Tutor: ALLOWED camera/mic\n');

    // Navigate both pages
    console.log('🔗 Opening pages...');
    await Promise.all([
      studentPage.goto(`http://localhost:3000/test-videolify?room=${roomId}&name=Student`, {
        waitUntil: 'networkidle0',
        timeout: TIMEOUT
      }),
      tutorPage.goto(`http://localhost:3000/test-videolify?room=${roomId}&name=Tutor`, {
        waitUntil: 'networkidle0',
        timeout: TIMEOUT
      })
    ]);

    console.log('✅ Pages loaded\n');

    // Wait for connection with timeout
    console.log('⏳ Waiting for P2P connection...');
    
    await Promise.all([
      studentPage.waitForFunction(
        () => window.__VIDEOLIFY_DEBUG__?.peerConnection?.connectionState === 'connected',
        { timeout: TIMEOUT }
      ),
      tutorPage.waitForFunction(
        () => window.__VIDEOLIFY_DEBUG__?.peerConnection?.connectionState === 'connected',
        { timeout: TIMEOUT }
      )
    ]);
    
    console.log('✅ P2P Connection established!\n');

    // Check Student state (blocked permissions)
    console.log('🔍 Checking Student state (blocked permissions)...');
    const studentState = await studentPage.evaluate(() => {
      const video = document.querySelector('[data-testid="local-video"]');
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      const overlay = document.querySelector('.absolute.inset-0');
      
      return {
        hasLocalVideo: !!video,
        hasRemoteVideo: !!remoteVideo,
        localVideoVisible: video ? getComputedStyle(video).display !== 'none' : false,
        remoteVideoVisible: remoteVideo ? getComputedStyle(remoteVideo).display !== 'none' : false,
        overlayText: overlay ? overlay.textContent : null,
        connectionStats: document.querySelector('[data-testid="connection-stats"]')?.textContent || 'N/A'
      };
    });

    console.log('  Local video:', studentState.hasLocalVideo ? '✅' : '❌');
    console.log('  Local video visible:', studentState.localVideoVisible ? '✅' : '❌');
    console.log('  Overlay text:', studentState.overlayText);
    console.log('  Remote video:', studentState.hasRemoteVideo ? '✅' : '❌');
    console.log('  Remote video visible:', studentState.remoteVideoVisible ? '✅ (CAN SEE TUTOR)' : '❌ (CANNOT SEE TUTOR)');
    console.log('  Connection:', studentState.connectionStats);

    // Check Tutor state (allowed permissions)
    console.log('\n🔍 Checking Tutor state (allowed permissions)...');
    const tutorState = await tutorPage.evaluate(() => {
      const video = document.querySelector('[data-testid="local-video"]');
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      
      return {
        hasLocalVideo: !!video,
        hasRemoteVideo: !!remoteVideo,
        localVideoVisible: video ? getComputedStyle(video).display !== 'none' : false,
        remoteVideoVisible: remoteVideo ? getComputedStyle(remoteVideo).display !== 'none' : false,
        connectionStats: document.querySelector('[data-testid="connection-stats"]')?.textContent || 'N/A'
      };
    });

    console.log('  Local video:', tutorState.hasLocalVideo ? '✅' : '❌');
    console.log('  Local video visible:', tutorState.localVideoVisible ? '✅' : '❌');
    console.log('  Remote video:', tutorState.hasRemoteVideo ? '✅' : '❌');
    console.log('  Remote video visible:', tutorState.remoteVideoVisible ? '✅ (CAN SEE STUDENT)' : '❌ (CANNOT SEE STUDENT)');
    console.log('  Connection:', tutorState.connectionStats);

    // Validate results
    console.log('\n📊 VALIDATION:');
    const errors = [];

    if (!studentState.remoteVideoVisible) {
      errors.push('❌ Student CANNOT see Tutor video (blocked permissions should still receive video)');
    } else {
      console.log('✅ Student CAN see Tutor video (blocked permissions can receive)');
    }

    if (studentState.localVideoVisible) {
      errors.push('❌ Student local video should NOT be visible (permissions blocked)');
    } else {
      console.log('✅ Student local video correctly hidden (permissions blocked)');
    }

    if (!studentState.overlayText?.includes('Camera tắt')) {
      errors.push('❌ Student overlay should show "Camera tắt"');
    } else {
      console.log('✅ Student overlay shows "Camera tắt"');
    }

    if (!tutorState.remoteVideoVisible) {
      console.log('⚠️  Tutor CANNOT see Student (expected - Student has no camera)');
    } else {
      console.log('⚠️  Tutor CAN see Student (dummy video - blank/black)');
    }

    if (errors.length > 0) {
      console.log('\n❌ TEST FAILED:');
      errors.forEach(err => console.log(err));
      return false;
    } else {
      console.log('\n✅ TEST PASSED: Connection works with blocked permissions!');
      console.log('   - Student can JOIN room without camera/mic');
      console.log('   - Student can SEE Tutor video');
      console.log('   - Student overlay shows correct message');
      return true;
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    return false;
  } finally {
    console.log('\n🧹 Cleaning up...');
    if (studentBrowser) await studentBrowser.close();
    if (tutorBrowser) await tutorBrowser.close();
  }
}

// Run test
console.log('═'.repeat(60));
testBlockedPermissions().then(success => {
  console.log('═'.repeat(60));
  process.exit(success ? 0 : 1);
});
