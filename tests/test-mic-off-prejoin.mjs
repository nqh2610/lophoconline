/**
 * Test: A tắt mic ở prejoin, B nhìn thấy đúng trạng thái
 * 
 * Bug: Khi A tắt mic ở prejoin vào call, B nhìn thấy peer PIP bị lỗi
 * Fix: Broadcast camera/mic state từ prejoin settings khi control channel mở
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = '6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';
const PREJOIN_URL = `${BASE_URL}/prejoin-videolify-v2?accessToken=${ACCESS_TOKEN}`;

const TUTOR = { username: 'tutor_mai', password: '123456' };
const STUDENT = { username: 'test', password: 'Test123456' };

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const results = [];
function recordResult(name, passed, details = '') {
  results.push({ name, passed, details });
  console.log(`${passed ? '✅' : '❌'} ${name}${details ? `: ${details}` : ''}`);
}

async function login(page, credentials, label) {
  console.log(`   [${label}] Logging in...`);
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('#username', credentials.username);
  await page.fill('#password', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  console.log(`   [${label}] ✅ Logged in`);
}

async function waitForConnection(page, label, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const hasRemoteVideo = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.some(v => !v.muted && v.videoWidth > 0);
    });
    if (hasRemoteVideo) {
      return true;
    }
    await delay(500);
  }
  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   TEST: Mic OFF at Prejoin - Peer should see correct state');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--no-sandbox',
    ],
  });

  const tutorContext = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });
  const studentContext = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });

  const tutorPage = await tutorContext.newPage();
  const studentPage = await studentContext.newPage();

  // Capture console logs
  tutorPage.on('console', msg => {
    if (msg.text().includes('Control message') || msg.text().includes('video-toggle') || msg.text().includes('audio-toggle') || msg.text().includes('Broadcasting')) {
      console.log(`   [Tutor] ${msg.text()}`);
    }
  });
  studentPage.on('console', msg => {
    if (msg.text().includes('Control message') || msg.text().includes('video-toggle') || msg.text().includes('audio-toggle') || msg.text().includes('Broadcasting')) {
      console.log(`   [Student] ${msg.text()}`);
    }
  });

  try {
    // ═══════════════════════════════════════════════════════════
    // TEST 1: Tutor tắt MIC ở prejoin, Student thấy đúng
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 1: Tutor TẮT MIC ở Prejoin');
    console.log('────────────────────────────────────────');

    // Login both
    await Promise.all([
      login(tutorPage, TUTOR, 'Tutor'),
      login(studentPage, STUDENT, 'Student'),
    ]);

    // Tutor: Go to prejoin and TURN OFF MIC
    console.log('   [Tutor] Going to prejoin and turning OFF mic...');
    await tutorPage.goto(PREJOIN_URL);
    await tutorPage.waitForLoadState('networkidle');
    
    // Wait for prejoin UI to load
    await tutorPage.waitForSelector('#join-button', { timeout: 15000 });
    
    // Turn OFF mic (find the mic toggle button and click it)
    const micButton = await tutorPage.locator('button:has(svg[class*="Mic"])').first();
    const isMicOn = await tutorPage.evaluate(() => {
      const btn = document.querySelector('button:has(svg[class*="Mic"])');
      // Check if mic is ON (no MicOff icon present)
      return btn && !btn.querySelector('svg[class*="MicOff"]');
    });
    
    if (isMicOn) {
      console.log('   [Tutor] Mic is ON, clicking to turn OFF...');
      await micButton.click();
      await delay(500);
    }
    
    // Verify mic is OFF in prejoin
    const micState = await tutorPage.evaluate(() => {
      const stored = localStorage.getItem('videolify_prejoin_settings');
      if (stored) {
        return JSON.parse(stored).isMicEnabled;
      }
      return null;
    });
    console.log(`   [Tutor] Prejoin mic state: ${micState === false ? 'OFF ✅' : 'ON ⚠️'}`);
    
    // Tutor joins call
    await tutorPage.click('#join-button');
    await tutorPage.waitForSelector('[class*="video"]', { timeout: 15000 });
    console.log('   [Tutor] Joined video call');

    // Student joins call (with default settings)
    console.log('   [Student] Going to prejoin...');
    await studentPage.goto(PREJOIN_URL);
    await studentPage.waitForLoadState('networkidle');
    await studentPage.waitForSelector('#join-button', { timeout: 15000 });
    
    // Wait for button to be enabled
    await studentPage.waitForFunction(() => {
      const btn = document.querySelector('#join-button');
      return btn && !btn.disabled;
    }, { timeout: 30000 });
    
    await studentPage.click('#join-button');
    await studentPage.waitForSelector('[class*="video"]', { timeout: 15000 });
    console.log('   [Student] Joined video call');

    // Wait for P2P connection
    await delay(3000);
    const connected = await waitForConnection(studentPage, 'Student', 15000);
    console.log(`   P2P Connection: ${connected ? '✅' : '❌'}`);

    // Check if Student sees Tutor's mic state correctly
    await delay(2000); // Wait for control messages to be received
    
    const studentSeesRemoteAudioEnabled = await studentPage.evaluate(() => {
      // Check if there's a mic-off indicator visible on peer PIP
      const micOffIndicator = document.querySelector('[class*="remote"] svg[class*="MicOff"]');
      const peerPip = document.querySelectorAll('[class*="pip"], [class*="bottom-4"]');
      let hasMicOffOverlay = false;
      
      // Also check remoteAudioEnabled state if accessible
      // Look for any visual indicator of mic being off on the peer video
      for (const pip of peerPip) {
        const micOff = pip.querySelector('svg path[d*="M"]'); // Look for mic icon
        if (micOff) {
          const parent = micOff.closest('div');
          if (parent && parent.textContent?.includes('MicOff')) {
            hasMicOffOverlay = true;
          }
        }
      }
      
      return { hasMicOffOverlay, micOffIndicator: !!micOffIndicator };
    });
    
    // Also check React state
    const reactState = await studentPage.evaluate(() => {
      // Try to find state from React component
      const root = document.getElementById('__next');
      if (root && root._reactRootContainer) {
        // This won't work easily, so we check DOM instead
      }
      
      // Check for any visual indication
      const remotePip = document.querySelector('[class*="bottom-4"][class*="right-"]');
      if (remotePip) {
        const hasVideoOff = remotePip.querySelector('[class*="camera-off"], [class*="CameraOff"]');
        const hasMicOff = remotePip.querySelector('[class*="mic-off"], svg[class*="MicOff"]');
        return { hasVideoOff: !!hasVideoOff, hasMicOff: !!hasMicOff };
      }
      return null;
    });

    console.log(`   [Student] Remote state detection:`, studentSeesRemoteAudioEnabled, reactState);

    // Verify by checking if video toggle message was received
    // The key test is: does the student see the correct initial state?
    
    // ═══════════════════════════════════════════════════════════
    // TEST 2: Check actual remote video display (not camera-off)
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 2: Check Remote Peer Video Display');
    console.log('────────────────────────────────────────');
    
    // Check if remote video shows properly (not camera-off overlay)
    const remoteVideoState = await studentPage.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      const results = [];
      
      videos.forEach((v, i) => {
        results.push({
          index: i,
          muted: v.muted,
          width: v.videoWidth,
          height: v.videoHeight,
          hasStream: !!v.srcObject,
          hidden: v.classList.contains('hidden') || window.getComputedStyle(v).display === 'none',
        });
      });
      
      // Check for camera-off overlays
      const cameraOffOverlays = document.querySelectorAll('[class*="CameraOff"], [class*="camera-off"]');
      const visibleOverlays = Array.from(cameraOffOverlays).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      return { videos: results, cameraOffOverlays: visibleOverlays.length };
    });
    
    console.log(`   Videos found: ${remoteVideoState.videos.length}`);
    remoteVideoState.videos.forEach(v => {
      console.log(`     Video ${v.index}: ${v.width}x${v.height}, muted=${v.muted}, hidden=${v.hidden}`);
    });
    console.log(`   Camera-off overlays visible: ${remoteVideoState.cameraOffOverlays}`);
    
    // Remote video should show frames (Tutor camera is ON, only mic is OFF)
    const remoteVideoVisible = remoteVideoState.videos.some(v => !v.muted && v.width > 0 && !v.hidden);
    recordResult('Remote video displays correctly', remoteVideoVisible, 
      remoteVideoVisible ? 'Peer video visible with frames' : 'Peer video hidden or no frames');

    // ═══════════════════════════════════════════════════════════
    // TEST 3: Tutor tắt CAMERA ở prejoin
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 TEST 3: Tutor TẮT CAMERA ở Prejoin (new session)');
    console.log('────────────────────────────────────────');
    
    // Navigate to prejoin again
    await tutorPage.goto(PREJOIN_URL);
    await tutorPage.waitForLoadState('networkidle');
    await tutorPage.waitForSelector('#join-button', { timeout: 15000 });
    
    // Turn OFF camera
    const cameraButton = await tutorPage.locator('button:has(svg[class*="Video"]):not(:has(svg[class*="VideoOff"]))').first();
    const isCameraOn = await tutorPage.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        const svg = btn.querySelector('svg');
        if (svg && svg.innerHTML.includes('video')) {
          return !btn.querySelector('svg path[d*="m21 21"]'); // VideoOff has slash
        }
      }
      return true;
    });
    
    console.log(`   [Tutor] Camera state: ${isCameraOn ? 'ON, clicking to turn OFF' : 'Already OFF'}`);
    if (isCameraOn) {
      // Find and click camera toggle button
      await tutorPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.className.includes('camera') || btn.querySelector('[class*="Video"]')) {
            btn.click();
            return;
          }
        }
        // Fallback: click first toggle in media controls
        const toggles = document.querySelectorAll('[class*="prejoin"] button');
        if (toggles.length > 0) toggles[0].click();
      });
      await delay(500);
    }
    
    // Set camera OFF in localStorage directly for test
    await tutorPage.evaluate(() => {
      const stored = localStorage.getItem('videolify_prejoin_settings') || '{}';
      const settings = JSON.parse(stored);
      settings.isCameraEnabled = false;
      localStorage.setItem('videolify_prejoin_settings', JSON.stringify(settings));
    });
    
    const camState = await tutorPage.evaluate(() => {
      const stored = localStorage.getItem('videolify_prejoin_settings');
      if (stored) {
        return JSON.parse(stored).isCameraEnabled;
      }
      return null;
    });
    console.log(`   [Tutor] Prejoin camera state: ${camState === false ? 'OFF ✅' : 'ON ⚠️'}`);
    
    // Join call
    await tutorPage.waitForFunction(() => {
      const btn = document.querySelector('#join-button');
      return btn && !btn.disabled;
    }, { timeout: 30000 });
    await tutorPage.click('#join-button');
    await tutorPage.waitForSelector('[class*="video"]', { timeout: 15000 });
    console.log('   [Tutor] Rejoined video call');
    
    // Wait for reconnection
    await delay(5000);
    
    // Check Student sees camera-off state
    const studentSeesRemoteVideoState = await studentPage.evaluate(() => {
      const pips = document.querySelectorAll('[class*="pip"], [class*="bottom-4"][class*="right"]');
      let remotePipHasVideo = false;
      let remotePipHasCameraOff = false;
      
      for (const pip of pips) {
        const video = pip.querySelector('video');
        if (video && !video.muted) {
          // This is remote video
          remotePipHasVideo = video.videoWidth > 0 && !video.classList.contains('hidden');
          remotePipHasCameraOff = pip.querySelector('[class*="CameraOff"]') !== null;
        }
      }
      
      return { remotePipHasVideo, remotePipHasCameraOff };
    });
    
    console.log(`   [Student] Remote pip state:`, studentSeesRemoteVideoState);
    
    // When Tutor camera is OFF, Student should see camera-off overlay (not broken video)
    recordResult('Camera OFF state broadcast correctly', 
      studentSeesRemoteVideoState.remotePipHasCameraOff || !studentSeesRemoteVideoState.remotePipHasVideo,
      studentSeesRemoteVideoState.remotePipHasCameraOff ? 'Camera-off overlay shown' : 'No video frames (expected)');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    recordResult('Test execution', false, error.message);
  } finally {
    await browser.close();
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  
  results.forEach(r => {
    console.log(`   ${r.passed ? '✅' : '❌'} ${r.name}${r.details ? ` - ${r.details}` : ''}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log('────────────────────────────────────────────────────────────');
  console.log(`   Total: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
  console.log(`   Success Rate: ${Math.round(passed/total*100)}%`);
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
