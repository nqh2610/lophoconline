/**
 * SIMPLE SCREEN SHARE TEST
 * Verify that peer can see screen when sharing
 */

import { chromium } from 'playwright';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  room: 'test-share-' + Date.now(),
  timeout: 30000
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🧪 SIMPLE SCREEN SHARE TEST');
  console.log('Room:', TEST_CONFIG.room);
  console.log('='.repeat(50));
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    // TEACHER: Join with camera
    console.log('\n👨‍🏫 TEACHER: Joining...');
    const teacherContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const teacherPage = await teacherContext.newPage();
    
    // Enable console logs
    teacherPage.on('console', msg => {
      if (msg.text().includes('[Screen Share]') || msg.text().includes('[VBG]') || msg.text().includes('📺')) {
        console.log('👨‍🏫 TEACHER:', msg.text());
      }
    });
    
    await teacherPage.goto(`${TEST_CONFIG.baseUrl}/test-videolify?room=${TEST_CONFIG.room}&name=Teacher`);
    await sleep(3000);
    
    // STUDENT: Join with camera
    console.log('\n👨‍🎓 STUDENT: Joining...');
    const studentContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const studentPage = await studentContext.newPage();
    
    // Enable console logs
    studentPage.on('console', msg => {
      if (msg.text().includes('[Screen Share]') || msg.text().includes('[VBG]') || msg.text().includes('📺')) {
        console.log('👨‍🎓 STUDENT:', msg.text());
      }
    });
    
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/test-videolify?room=${TEST_CONFIG.room}&name=Student`);
    await sleep(3000);
    
    // Wait for connection
    console.log('\n🔗 Waiting for connection...');
    const connected = await teacherPage.waitForSelector('[data-testid="connection-status-dot"][style*="rgb(34, 197, 94)"]', { 
      timeout: TEST_CONFIG.timeout 
    }).then(() => true).catch(() => false);
    
    if (!connected) {
      console.error('❌ Connection failed');
      await sleep(3000);
      await browser.close();
      return;
    }
    console.log('✅ Connected');
    
    // Check initial state
    await sleep(1000);
    console.log('\n📹 Initial State:');
    
    const teacherInitial = await teacherPage.evaluate(() => {
      const video = document.querySelector('[data-testid="remote-video"]');
      return {
        visible: video && window.getComputedStyle(video).display !== 'none',
        playing: video && !video.paused && video.readyState >= 2,
        overlay: document.querySelector('text=Camera tắt') ? true : false
      };
    });
    console.log('   Teacher sees student:', teacherInitial.visible && teacherInitial.playing ? '✅' : '❌');
    
    // TEACHER: Start screen share
    console.log('\n📺 TEACHER: Starting screen share...');
    
    // Mock getDisplayMedia
    await teacherPage.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw colorful screen
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🖥️ SCREEN SHARING', canvas.width/2, canvas.height/2);
        ctx.font = '60px Arial';
        ctx.fillText('Teaching Content Here', canvas.width/2, canvas.height/2 + 100);
      }
      const fakeScreenStream = canvas.captureStream(30);
      
      // Mock getDisplayMedia with screen label
      navigator.mediaDevices.getDisplayMedia = function() {
        console.log('📺 [MOCK] getDisplayMedia called');
        // Modify track label to simulate screen share
        const track = fakeScreenStream.getVideoTracks()[0];
        Object.defineProperty(track, 'label', {
          value: 'screen:0:0',
          writable: false
        });
        return Promise.resolve(fakeScreenStream);
      };
    });
    
    // Click share button
    const shareButton = teacherPage.locator('[data-testid="screen-share-button"]');
    if (await shareButton.count() === 0) {
      console.error('❌ Share button not found');
      return;
    }
    
    await shareButton.click();
    await sleep(3000); // Wait for track replacement
    
    console.log('✅ Screen share button clicked');
    
    // VERIFY: Student sees teacher's screen
    console.log('\n👁️ VERIFY: Student should see teacher\'s screen...');
    
    const studentView = await studentPage.evaluate(() => {
      const video = document.querySelector('[data-testid="remote-video"]');
      const overlay = document.body.textContent?.includes('Camera tắt');
      return {
        exists: !!video,
        visible: video && window.getComputedStyle(video).display !== 'none',
        playing: video && !video.paused && video.readyState >= 2,
        width: video?.videoWidth || 0,
        height: video?.videoHeight || 0,
        srcObject: video?.srcObject ? 'present' : 'missing',
        overlay: overlay || false
      };
    });
    
    console.log('   Remote video exists:', studentView.exists ? '✅' : '❌');
    console.log('   Remote video visible:', studentView.visible ? '✅' : '❌');
    console.log('   Remote video playing:', studentView.playing ? '✅' : '❌');
    console.log('   Resolution:', studentView.width + 'x' + studentView.height);
    console.log('   srcObject:', studentView.srcObject);
    console.log('   "Camera tắt" overlay:', studentView.overlay ? '❌ SHOWN (BUG!)' : '✅ HIDDEN');
    
    // STOP and verify
    console.log('\n🛑 TEACHER: Stopping screen share...');
    await shareButton.click();
    await sleep(2000);
    
    const afterStop = await studentPage.evaluate(() => {
      const video = document.querySelector('[data-testid="remote-video"]');
      return {
        visible: video && window.getComputedStyle(video).display !== 'none',
        playing: video && !video.paused && video.readyState >= 2
      };
    });
    
    console.log('   Student still sees video:', afterStop.visible && afterStop.playing ? '✅' : '❌');
    
    // FINAL RESULT
    console.log('\n' + '='.repeat(50));
    const success = studentView.visible && 
                    studentView.playing && 
                    !studentView.overlay &&
                    afterStop.visible;
    
    if (success) {
      console.log('✅✅✅ TEST PASSED!');
      console.log('✅ Student can see teacher\'s screen share');
      console.log('✅ No "Camera tắt" overlay during share');
      console.log('✅ Connection stable after stop');
    } else {
      console.log('❌ TEST FAILED');
      if (!studentView.visible) console.log('   ❌ Video not visible');
      if (!studentView.playing) console.log('   ❌ Video not playing');
      if (studentView.overlay) console.log('   ❌ Overlay blocking view');
      if (!afterStop.visible) console.log('   ❌ Connection lost after stop');
    }
    console.log('='.repeat(50));
    
    await sleep(3000);
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main();
