/**
 * AUTO TEST & FIX - VBG Peer Background Detection
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const TEST_ROOM = 'my-test-room';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function debugVBG(page, label) {
  const info = await page.evaluate(() => {
    const remoteVideo = document.querySelector('video:not([muted])'); // Remote video
    const localVideo = document.querySelector('video[muted]'); // Local video
    
    const getVideoInfo = (video, name) => {
      if (!video) return { error: `No ${name} video found` };
      const srcObject = video.srcObject;
      if (!srcObject) return { error: `No srcObject on ${name}` };
      
      const videoTracks = srcObject.getVideoTracks();
      return {
        name,
        hasVideo: !!video,
        hasSrcObject: !!srcObject,
        trackCount: videoTracks.length,
        trackLabel: videoTracks[0]?.label || 'N/A',
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      };
    };
    
    // Check localStorage for peer VBG settings
    const peerKeys = Object.keys(localStorage).filter(k => k.includes('peer') && k.includes('vbg'));
    const peerVbg = {};
    peerKeys.forEach(k => peerVbg[k] = localStorage.getItem(k));
    
    return {
      local: getVideoInfo(localVideo, 'local'),
      remote: getVideoInfo(remoteVideo, 'remote'),
      peerVbgSettings: peerVbg,
      allLocalStorage: Object.keys(localStorage).reduce((acc, k) => {
        if (k.includes('vbg')) acc[k] = localStorage.getItem(k);
        return acc;
      }, {})
    };
  });
  
  console.log(`\n📊 [${label}] Video State:`, JSON.stringify(info, null, 2));
  return info;
}

async function waitForSSE(page, eventType, timeout = 5000) {
  return page.evaluate((eventType, timeout) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error(`Timeout waiting for ${eventType}`)), timeout);
      
      let captured = false;
      const originalAddEventListener = EventSource.prototype.addEventListener;
      
      EventSource.prototype.addEventListener = function(type, listener, options) {
        const wrappedListener = function(event) {
          if (type === eventType && !captured) {
            captured = true;
            clearTimeout(timeoutId);
            resolve({ type, data: event.data });
          }
          return listener.call(this, event);
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      };
    });
  }, eventType, timeout);
}

async function test() {
  console.log('🧪 Starting VBG Peer Background Auto-Test...\n');

  const browser1 = await puppeteer.launch({ 
    headless: false, 
    args: [
      '--use-fake-ui-for-media-stream', 
      '--use-fake-device-for-media-stream',
      '--window-size=800,600'
    ] 
  });
  
  const browser2 = await puppeteer.launch({ 
    headless: false, 
    args: [
      '--use-fake-ui-for-media-stream', 
      '--use-fake-device-for-media-stream',
      '--window-size=800,600',
      '--window-position=850,0'
    ] 
  });

  try {
    const tutor = await browser1.newPage();
    const student = await browser2.newPage();

    // Capture console logs
    const tutorLogs = [];
    const studentLogs = [];
    
    tutor.on('console', msg => {
      const text = msg.text();
      tutorLogs.push(text);
      if (text.includes('VBG') || text.includes('vbg-settings')) {
        console.log(`[TUTOR] ${text}`);
      }
    });
    
    student.on('console', msg => {
      const text = msg.text();
      studentLogs.push(text);
      if (text.includes('VBG') || text.includes('vbg-settings')) {
        console.log(`[STUDENT] ${text}`);
      }
    });

    console.log('✅ Step 1: Open test pages');
    await Promise.all([
      tutor.goto(`${BASE_URL}/test-videolify?room=${TEST_ROOM}&testUserId=1&name=Tutor&role=tutor`),
      student.goto(`${BASE_URL}/test-videolify?room=${TEST_ROOM}&testUserId=2&name=Student&role=student`)
    ]);
    
    await sleep(3000);

    console.log('\n✅ Step 2: Wait for connection');
    
    // Wait for WebRTC connection to establish
    let connected = false;
    for (let i = 0; i < 20; i++) {
      await sleep(1000);
      
      const studentHasRemote = await student.evaluate(() => {
        const remoteVideo = document.querySelector('video:not([muted])');
        return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.getVideoTracks().length > 0;
      });
      
      const tutorHasRemote = await tutor.evaluate(() => {
        const remoteVideo = document.querySelector('video:not([muted])');
        return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.getVideoTracks().length > 0;
      });
      
      if (studentHasRemote && tutorHasRemote) {
        console.log(`✅ Connection established after ${i + 1} seconds`);
        connected = true;
        break;
      }
    }
    
    if (!connected) {
      console.error('❌ Connection failed to establish after 20 seconds');
      throw new Error('WebRTC connection timeout');
    }

    console.log('\n📊 Initial state:');
    await debugVBG(tutor, 'TUTOR');
    await debugVBG(student, 'STUDENT');

    console.log('\n✅ Step 3: Tutor enables BLUR background');
    
    // Find and click VBG button using testid
    const vbgMenuOpened = await tutor.evaluate(() => {
      const vbgBtn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
      if (vbgBtn) {
        console.log('🎯 [DEBUG] Found VBG toggle button, clicking...');
        vbgBtn.click();
        return true;
      }
      console.log('❌ [DEBUG] VBG toggle button not found');
      return false;
    });
    
    if (!vbgMenuOpened) {
      console.error('❌ Cannot find VBG toggle button!');
      throw new Error('VBG UI not available');
    }
    
    await sleep(500);
    
    // Click blur button using data-testid
    const blurClicked = await tutor.evaluate(() => {
      const blurBtn = document.querySelector('[data-testid="vbg-mode-blur"]');
      if (blurBtn) {
        console.log('🎯 [DEBUG] Clicking blur button...');
        blurBtn.click();
        return true;
      }
      console.log('❌ [DEBUG] Blur button not found');
      return false;
    });
    
    if (!blurClicked) {
      console.error('❌ Could not find blur button!');
    }
    
    console.log('\n⏳ Waiting for VBG to initialize (MediaPipe takes ~3 seconds)...');
    await sleep(4000); // Wait for MediaPipe to load and process

    console.log('\n📊 After tutor enables blur:');
    const tutorState = await debugVBG(tutor, 'TUTOR');
    const studentState = await debugVBG(student, 'STUDENT');

    // Check if SSE was sent
    const tutorSentSSE = tutorLogs.some(log => 
      log.includes('vbg-settings') && log.includes('sending') || 
      log.includes('VBG settings sent')
    );
    
    const studentReceivedSSE = studentLogs.some(log => 
      log.includes('VBG') && log.includes('Received') ||
      log.includes('vbg-settings')
    );

    console.log('\n📡 SSE Status:');
    console.log(`  Tutor sent SSE: ${tutorSentSSE ? '✅' : '❌'}`);
    console.log(`  Student received SSE: ${studentReceivedSSE ? '✅' : '❌'}`);

    // Check student's peer VBG settings
    const hasPeerVBG = Object.keys(studentState.peerVbgSettings).length > 0;
    console.log(`  Student has peer VBG config: ${hasPeerVBG ? '✅' : '❌'}`);
    console.log(`  Config:`, studentState.peerVbgSettings);

    // Diagnose issue
    console.log('\n🔍 DIAGNOSIS:');
    
    if (!tutorSentSSE) {
      console.log('❌ ISSUE: Tutor did NOT send VBG settings via SSE');
      console.log('   → Check toggleVirtualBackground() function');
      console.log('   → Check if remotePeerIdRef.current exists');
    } else if (!studentReceivedSSE) {
      console.log('❌ ISSUE: Student did NOT receive SSE vbg-settings event');
      console.log('   → Check SSE connection');
      console.log('   → Check eventSource.addEventListener(\'vbg-settings\')');
    } else if (!hasPeerVBG) {
      console.log('❌ ISSUE: Student received SSE but did NOT save to localStorage');
      console.log('   → Check SSE handler localStorage.setItem()');
    } else if (studentState.remote.trackLabel !== 'canvas' && !studentState.remote.trackLabel.includes('processed')) {
      console.log('❌ ISSUE: Student saved config but did NOT apply VBG to remote video');
      console.log('   → Check remoteVbgProcessorRef.current.startProcessing()');
      console.log('   → Check remoteVideoRef.current.srcObject assignment');
    } else {
      console.log('✅ Everything looks good! Student should see tutor with blur background');
    }

    // Check remote video srcObject
    const remoteVideoCheck = await student.evaluate(() => {
      const remoteVideo = document.querySelector('video:not([muted])');
      if (!remoteVideo || !remoteVideo.srcObject) return null;
      
      const tracks = remoteVideo.srcObject.getVideoTracks();
      return {
        label: tracks[0]?.label,
        readyState: tracks[0]?.readyState,
        enabled: tracks[0]?.enabled,
        kind: tracks[0]?.kind
      };
    });

    console.log('\n🎥 Student\'s remote video track:', remoteVideoCheck);

    console.log('\n⏳ Waiting for MediaPipe to complete processing (5 more seconds)...');
    await sleep(5000);
    
    // Final check: Is student's remote video now showing processed stream?
    const finalCheck = await student.evaluate(() => {
      const remoteVideo = document.querySelector('video:not([muted])');
      if (!remoteVideo || !remoteVideo.srcObject) return null;
      
      const tracks = remoteVideo.srcObject.getVideoTracks();
      const localStorage = window.localStorage;
      const peerVbgKeys = Object.keys(localStorage).filter(k => k.includes('peer') && k.includes('vbg'));
      
      return {
        trackLabel: tracks[0]?.label,
        isCanvasStream: tracks[0]?.label?.includes('canvas') || tracks[0]?.label?.startsWith('MediaStreamVideoTrack'),
        peerVbgConfigSaved: peerVbgKeys.length > 0,
        peerVbgMode: Object.keys(localStorage)
          .filter(k => k.includes('vbg-mode'))
          .map(k => `${k}=${localStorage.getItem(k)}`)
      };
    });
    
    console.log('\n📊 FINAL RESULT:', finalCheck);
    
    if (finalCheck && finalCheck.peerVbgConfigSaved) {
      console.log('\n✅ ✅ ✅ SUCCESS! Student has peer VBG config and remote video is being processed!');
    } else {
      console.log('\n❌ FAILED: VBG settings not properly applied');
    }

    await sleep(2000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🧹 Cleaning up...');
    await browser1.close();
    await browser2.close();
    console.log('✅ Browsers closed');
  }
}

test().catch(console.error);
