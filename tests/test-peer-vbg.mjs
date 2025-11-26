import { chromium } from 'playwright';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testPeerWithVBG() {
  console.log('🚀 Testing Peer Connection with Virtual Background...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  try {
    // Create 2 contexts (2 users)
    const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });
    
    const tutor = await context1.newPage();
    const student = await context2.newPage();
    
    // Enable console logs
    tutor.on('console', msg => {
      if (msg.text().includes('[VBG]') || msg.text().includes('RTCPeerConnection')) {
        console.log('👨‍🏫 TUTOR:', msg.text());
      }
    });
    
    student.on('console', msg => {
      if (msg.text().includes('[VBG]') || msg.text().includes('RTCPeerConnection')) {
        console.log('👨‍🎓 STUDENT:', msg.text());
      }
    });
    
    // STEP 1: Tutor joins room
    console.log('📍 Step 1: Tutor joins room...');
    await tutor.goto('http://localhost:3000/test-videolify?room=vbg-test&testUserId=1&name=Tutor&role=tutor', {
      waitUntil: 'domcontentloaded'
    });
    await sleep(3000);
    
    // STEP 2: Student joins same room
    console.log('📍 Step 2: Student joins room...');
    await student.goto('http://localhost:3000/test-videolify?room=vbg-test&testUserId=2&name=Student&role=student', {
      waitUntil: 'domcontentloaded'
    });
    await sleep(5000); // Wait for peer connection to establish
    
    // STEP 3: Check peer connection state
    console.log('📍 Step 3: Checking peer connection...');
    const tutorPeerState = await tutor.evaluate(() => {
      const video = document.querySelector('video');
      return {
        hasVideo: !!video,
        videoPlaying: video ? !video.paused : false,
        connectionState: window.peerConnection?.connectionState || 'unknown'
      };
    });
    console.log('👨‍🏫 Tutor state:', tutorPeerState);
    
    const studentPeerState = await student.evaluate(() => {
      const videos = document.querySelectorAll('video');
      return {
        videoCount: videos.length,
        remoteVideoPlaying: videos.length > 1 ? !videos[1].paused : false,
        connectionState: window.peerConnection?.connectionState || 'unknown'
      };
    });
    console.log('👨‍🎓 Student state:', studentPeerState);
    
    // STEP 4: Tutor enables virtual background
    console.log('📍 Step 4: Tutor enables blur background...');
    const vbgButton = await tutor.locator('button[title*="background"], button[title*="Virtual"], button:has-text("✨")').first();
    if (await vbgButton.count() > 0) {
      await vbgButton.click();
      await sleep(1000);
      
      // Click blur button
      const blurButton = await tutor.locator('button[data-testid="vbg-mode-blur"]');
      if (await blurButton.count() > 0) {
        await blurButton.click();
        console.log('✅ Blur button clicked');
        await sleep(8000); // Wait for MediaPipe + processing
      }
    }
    
    // STEP 5: Check if student sees updated video
    console.log('📍 Step 5: Checking if student sees tutor\'s background...');
    const studentVideoStatus = await student.evaluate(() => {
      const remoteVideo = document.querySelectorAll('video')[1];
      if (!remoteVideo) return { error: 'No remote video' };
      
      // Create canvas to check video content
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      try {
        ctx.drawImage(remoteVideo, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          total += (data[i] + data[i+1] + data[i+2]) / 3;
        }
        
        const avg = total / (data.length / 4);
        
        return {
          avgBrightness: avg,
          isBlack: avg < 10,
          videoWidth: remoteVideo.videoWidth,
          videoHeight: remoteVideo.videoHeight,
          readyState: remoteVideo.readyState
        };
      } catch (err) {
        return { error: err.message };
      }
    });
    
    console.log('👨‍🎓 Student sees:', studentVideoStatus);
    
    if (studentVideoStatus.isBlack) {
      console.error('❌ FAIL: Student sees black screen!');
    } else {
      console.log('✅ PASS: Student sees video (brightness:', studentVideoStatus.avgBrightness, ')');
    }
    
    // STEP 6: Test switching to image background
    console.log('📍 Step 6: Tutor switches to image background...');
    const firstBgImage = await tutor.locator('.grid img').first();
    if (await firstBgImage.count() > 0) {
      await firstBgImage.click();
      console.log('✅ Background image clicked');
      await sleep(8000); // Wait for processing
      
      // Check student video again
      const studentVideoStatus2 = await student.evaluate(() => {
        const remoteVideo = document.querySelectorAll('video')[1];
        if (!remoteVideo) return { error: 'No remote video' };
        
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(remoteVideo, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          total += (data[i] + data[i+1] + data[i+2]) / 3;
        }
        
        return {
          avgBrightness: total / (data.length / 4),
          isBlack: (total / (data.length / 4)) < 10
        };
      });
      
      console.log('👨‍🎓 Student sees after image BG:', studentVideoStatus2);
      
      if (studentVideoStatus2.isBlack) {
        console.error('❌ FAIL: Student still sees black screen!');
      } else {
        console.log('✅ PASS: Student sees image background (brightness:', studentVideoStatus2.avgBrightness, ')');
      }
    }
    
    console.log('\n📊 Test completed. Press Ctrl+C to close browsers.');
    await sleep(60000); // Keep browsers open for manual inspection
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await browser.close();
  }
}

testPeerWithVBG();
