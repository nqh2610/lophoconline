#!/usr/bin/env node
/**
 * REAL BLOCKED CAMERA TEST - Force getUserMedia to fail
 * This simulates real browser blocking by mocking the getUserMedia API
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify';

async function testBlockedCamera() {
  console.log('🧪 TESTING: Real blocked camera/mic simulation');
  console.log('='.repeat(60));
  console.log('🚀 Launching browsers...\n');

  const ROOM = `blocked-real-${Date.now()}`;
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });

  try {
    // STUDENT: Block permissions by mocking getUserMedia to fail
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();

    // TUTOR: Allow permissions normally
    const tutorContext = await browser.newContext({
      permissions: ['camera', 'microphone']
    });
    const tutorPage = await tutorContext.newPage();

    console.log('📝 Room ID:', ROOM);
    console.log('🟩 Student: MOCKED to fail getUserMedia (simulates block)');
    console.log('🟦 Tutor: ALLOWED camera/mic\n');

    // Capture logs
    const studentLogs = [];
    const tutorLogs = [];

    studentPage.on('console', msg => {
      const text = msg.text();
      studentLogs.push(`🟩 STUDENT: ${text}`);
      if (text.includes('dummy') || text.includes('Camera') || text.includes('denied') || 
          text.includes('user-info') || text.includes('videoEnabled')) {
        console.log(`🟩 STUDENT: ${text}`);
      }
    });

    tutorPage.on('console', msg => {
      const text = msg.text();
      tutorLogs.push(`🟦 TUTOR: ${text}`);
      if (text.includes('remote') || text.includes('user-info') || text.includes('videoEnabled')) {
        console.log(`🟦 TUTOR: ${text}`);
      }
    });

    console.log('🔗 Opening pages...');

    // STUDENT: Inject mock BEFORE loading page
    await studentPage.addInitScript(() => {
      // Enable test mode to expose state
      window.__VIDEOLIFY_TEST_MODE__ = true;
      
      // Override getUserMedia BEFORE any code runs
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        console.log('[TEST MOCK] getUserMedia called, FORCING failure to simulate block');
        throw new DOMException('Permission denied by test mock', 'NotAllowedError');
      };
      console.log('[TEST MOCK] ✅ getUserMedia mocked to always fail (injected before page load)');
    });

    await studentPage.goto(`${BASE_URL}?room=${ROOM}&name=Student&role=student`, { 
      waitUntil: 'domcontentloaded' 
    });

    await new Promise(r => setTimeout(r, 2000));

    // TUTOR: Normal behavior
    await tutorPage.goto(`${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor`, { 
      waitUntil: 'domcontentloaded' 
    });

    console.log('✅ Pages loaded\n');

    // Wait for connection
    console.log('⏳ Waiting for P2P connection...');
    let connected = false;
    for (let i = 0; i < 60; i++) {
      const studentConnected = await studentPage.evaluate(() => {
        const indicator = document.querySelector('[data-testid="connection-indicator"]');
        return indicator?.getAttribute('data-connected') === 'true';
      });

      if (studentConnected) {
        connected = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!connected) {
      console.log('❌ Connection failed - timeout after 12s');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ P2P Connection established!\n');
    
    // Wait longer for VBG timeout (3s) + buffer
    console.log('⏳ Waiting for remote video to be set (VBG timeout + buffer)...');
    await new Promise(r => setTimeout(r, 4000));

    // CHECK STUDENT STATE (blocked permissions)
    console.log('🔍 Checking Student state (blocked via mock)...');
    const studentState = await studentPage.evaluate(() => {
      const localVideo = document.querySelector('[data-testid="local-video"]');
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      const connectionIndicator = document.querySelector('[data-testid="connection-indicator"]');

      // Local overlay: Check if PiP shows "Camera tắt"
      const pipContainer = localVideo?.closest('.group'); // PiP is in a group div
      const localOverlayElements = pipContainer ? 
        Array.from(pipContainer.querySelectorAll('p')).filter(p => 
          p.textContent?.trim() === 'Camera tắt'
        ) : [];
      const localOverlayText = localOverlayElements.length > 0 ? 'Camera tắt' : '';

      return {
        hasLocalVideo: !!localVideo,
        localVideoVisible: localVideo ? !localVideo.paused && localVideo.readyState >= 2 : false,
        localOverlayText,
        hasRemoteVideo: !!remoteVideo,
        remoteVideoVisible: remoteVideo ? !remoteVideo.paused && remoteVideo.readyState >= 2 : false,
        connected: connectionIndicator?.getAttribute('data-connected') === 'true',
        // Check if using dummy media
        usingDummy: window.__VIDEOLIFY_TEST_STATE__?.usingDummyMedia || false,
        isVideoEnabled: window.__VIDEOLIFY_TEST_STATE__?.isVideoEnabled,
      };
    });

    console.log('  Local video:', studentState.hasLocalVideo ? '✅' : '❌');
    console.log('  Local video visible:', studentState.localVideoVisible ? '✅' : '❌');
    console.log('  Local overlay text:', studentState.localOverlayText || 'NONE');
    console.log('  Using dummy tracks:', studentState.usingDummy ? '✅' : '❌');
    console.log('  isVideoEnabled:', studentState.isVideoEnabled);
    console.log('  Remote video:', studentState.hasRemoteVideo ? '✅' : '❌');
    
    // Debug remote video state
    const remoteDebug = await studentPage.evaluate(() => {
      const rv = document.querySelector('[data-testid="remote-video"]');
      return rv ? {
        paused: rv.paused,
        readyState: rv.readyState,
        srcObject: !!rv.srcObject,
        tracks: rv.srcObject ? rv.srcObject.getTracks().length : 0,
        muted: rv.muted,
      } : null;
    });
    console.log('  Remote video DEBUG:', remoteDebug);
    console.log('  Remote video visible:', studentState.remoteVideoVisible ? '✅ (CAN SEE TUTOR)' : '❌');
    console.log('  Connection:', studentState.connected ? '✅' : '❌');

    // CHECK TUTOR STATE (sees Student with dummy video)
    console.log('\n🔍 Checking Tutor state (sees Student)...');
    const tutorState = await tutorPage.evaluate(() => {
      const localVideo = document.querySelector('[data-testid="local-video"]');
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      const connectionIndicator = document.querySelector('[data-testid="connection-indicator"]');

      // Remote overlay: Check if it contains "Camera tắt" text
      const remoteOverlayElements = Array.from(document.querySelectorAll('h3, p')).filter(el => 
        el.textContent?.trim() === 'Camera tắt'
      );
      const remoteOverlayText = remoteOverlayElements.length > 0 ? 'Camera tắt' : '';
      const remoteOverlayVisible = remoteOverlayElements.length > 0 && 
        window.getComputedStyle(remoteOverlayElements[0].parentElement).display !== 'none';

      return {
        hasLocalVideo: !!localVideo,
        localVideoVisible: localVideo ? !localVideo.paused && localVideo.readyState >= 2 : false,
        hasRemoteVideo: !!remoteVideo,
        remoteVideoVisible: remoteVideo ? !remoteVideo.paused && remoteVideo.readyState >= 2 : false,
        remoteOverlayText,
        remoteOverlayVisible,
        connected: connectionIndicator?.getAttribute('data-connected') === 'true',
      };
    });

    console.log('  Local video:', tutorState.hasLocalVideo ? '✅' : '❌');
    console.log('  Local video visible:', tutorState.localVideoVisible ? '✅' : '❌');
    console.log('  Remote video:', tutorState.hasRemoteVideo ? '✅' : '❌');
    
    // Debug remote video state
    const tutorRemoteDebug = await tutorPage.evaluate(() => {
      const rv = document.querySelector('[data-testid="remote-video"]');
      return rv ? {
        paused: rv.paused,
        readyState: rv.readyState,
        srcObject: !!rv.srcObject,
        tracks: rv.srcObject ? rv.srcObject.getTracks().length : 0,
      } : null;
    });
    console.log('  Remote video DEBUG:', tutorRemoteDebug);
    console.log('  Remote video visible:', tutorState.remoteVideoVisible ? '⚠️  (sees dummy/blank)' : '❌');
    console.log('  Remote overlay visible:', tutorState.remoteOverlayVisible ? '✅' : '❌');
    console.log('  Remote overlay text:', tutorState.remoteOverlayText || 'NONE');
    
    // Debug overlay visibility
    const overlayDebug = await tutorPage.evaluate(() => {
      const overlays = Array.from(document.querySelectorAll('h3, p')).filter(el => 
        el.textContent?.trim() === 'Camera tắt'
      );
      
      // Check remoteVideoEnabled state
      const remoteVideoEnabled = window.__VIDEOLIFY_TEST_STATE__?.connectionStats?.remoteVideoEnabled;
      
      return {
        overlayCount: overlays.length,
        overlays: overlays.map(el => ({
          tag: el.tagName,
          text: el.textContent.trim(),
          display: window.getComputedStyle(el.parentElement).display,
          opacity: window.getComputedStyle(el.parentElement).opacity,
        })),
        remoteVideoEnabled,
        showWhiteboard: window.__VIDEOLIFY_TEST_STATE__?.showWhiteboard,
        connected: window.__VIDEOLIFY_TEST_STATE__?.connectionStats?.connected,
      };
    });
    console.log('  Overlay DEBUG:', JSON.stringify(overlayDebug, null, 2));
    console.log('  Connection:', tutorState.connected ? '✅' : '❌');

    // VALIDATION
    console.log('\n📊 VALIDATION:');
    const results = {
      studentConnectionWorks: studentState.connected,
      studentCanSeeTutor: studentState.remoteVideoVisible,
      studentUsingDummy: studentState.usingDummy,
      studentVideoDisabled: studentState.isVideoEnabled === false,
      studentLocalOverlay: studentState.localOverlayText === 'Camera tắt',
      tutorSeesOverlay: tutorState.remoteOverlayVisible,
      tutorOverlayCorrect: tutorState.remoteOverlayText === 'Camera tắt',
    };

    let allPass = true;

    if (results.studentConnectionWorks) {
      console.log('✅ Student connected despite blocked camera');
    } else {
      console.log('❌ Student failed to connect');
      allPass = false;
    }

    if (results.studentCanSeeTutor) {
      console.log('✅ Student CAN see Tutor video');
    } else {
      console.log('❌ Student cannot see Tutor');
      allPass = false;
    }

    if (results.studentUsingDummy) {
      console.log('✅ Student using dummy tracks (permissions blocked)');
    } else {
      console.log('❌ Student NOT using dummy tracks (mock failed?)');
      allPass = false;
    }

    if (results.studentVideoDisabled) {
      console.log('✅ Student isVideoEnabled = false');
    } else {
      console.log('❌ Student isVideoEnabled should be false');
      allPass = false;
    }

    if (results.studentLocalOverlay) {
      console.log('✅ Student local overlay shows "Camera tắt"');
    } else {
      console.log(`❌ Student local overlay incorrect: "${studentState.localOverlayText}"`);
      allPass = false;
    }

    if (results.tutorSeesOverlay) {
      console.log('✅ Tutor sees remote overlay (Student camera off)');
    } else {
      console.log('❌ Tutor does NOT see overlay');
      allPass = false;
    }

    if (results.tutorOverlayCorrect) {
      console.log('✅ Tutor overlay text correct: "Camera tắt"');
    } else {
      console.log(`❌ Tutor overlay text incorrect: "${tutorState.remoteOverlayText}"`);
      allPass = false;
    }

    console.log('\n' + '='.repeat(60));
    if (allPass) {
      console.log('✅ ALL TESTS PASSED - Blocked camera scenario works perfectly!');
      console.log('='.repeat(60));
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED - See details above');
      console.log('='.repeat(60));
      await browser.close();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ TEST CRASHED:', error);
    await browser.close();
    process.exit(1);
  }
}

testBlockedCamera();
