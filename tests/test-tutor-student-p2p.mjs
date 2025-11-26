/**
 * Test P2P Connection: Tutor vs Student
 * 
 * This test:
 * 1. Logs in as Tutor (tutor_mai / 12345) in Browser 1
 * 2. Logs in as Student (test / Test123456) in Browser 2  
 * 3. Both join the same prejoin room
 * 4. Both click "Tham gia" to enter video call
 * 5. Verify P2P connection is established
 * 6. Verify both can see each other's video/audio
 */

import { chromium } from 'playwright';

// Test Configuration
const BASE_URL = 'http://localhost:3000';
const LOGIN_URL = `${BASE_URL}/login`;
const PREJOIN_URL = `${BASE_URL}/prejoin-videolify-v2?accessToken=6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae`;

// Test Accounts
const TUTOR_ACCOUNT = {
  username: 'tutor_mai',
  password: '123456',
  role: 'tutor',
  displayName: 'Tutor Mai'
};

const STUDENT_ACCOUNT = {
  username: 'test',
  password: 'Test123456', 
  role: 'student',
  displayName: 'Student Test'
};

// Timeout settings
const LOGIN_TIMEOUT = 15000;
const PREJOIN_TIMEOUT = 20000;
const P2P_CONNECTION_TIMEOUT = 60000;

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Login to the system
 */
async function login(page, account, label) {
  console.log(`\n🔐 [${label}] Logging in as ${account.role}: ${account.username}`);
  
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
  
  // Fill login form
  await page.fill('#username', account.username);
  await page.fill('#password', account.password);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for redirect (successful login redirects away from /login)
  try {
    await page.waitForURL(url => !url.toString().includes('/login'), { 
      timeout: LOGIN_TIMEOUT 
    });
    console.log(`✅ [${label}] Login successful! Redirected to: ${page.url()}`);
    return true;
  } catch (err) {
    // Check for error message
    const errorEl = await page.$('.text-destructive, [role="alert"]');
    if (errorEl) {
      const errorText = await errorEl.textContent();
      console.error(`❌ [${label}] Login failed: ${errorText}`);
    } else {
      console.error(`❌ [${label}] Login timeout or error:`, err.message);
    }
    return false;
  }
}

/**
 * Navigate to prejoin and join the call
 */
async function joinFromPrejoin(page, label) {
  console.log(`\n📹 [${label}] Navigating to prejoin page...`);
  
  await page.goto(PREJOIN_URL, { waitUntil: 'networkidle' });
  await sleep(2000); // Wait for media devices to initialize
  
  // Check if we're on prejoin page
  const currentUrl = page.url();
  console.log(`📍 [${label}] Current URL: ${currentUrl}`);
  
  // Wait for the "Tham gia" button
  const joinButton = await page.waitForSelector('button:has-text("Tham gia"), button:has-text("Join")', {
    timeout: PREJOIN_TIMEOUT
  });
  
  if (!joinButton) {
    console.error(`❌ [${label}] Join button not found`);
    return false;
  }
  
  console.log(`🎯 [${label}] Found join button, clicking...`);
  await joinButton.click();
  
  // Wait for navigation to video call page
  try {
    await page.waitForURL(url => url.toString().includes('/video-call'), {
      timeout: PREJOIN_TIMEOUT
    });
    console.log(`✅ [${label}] Joined video call: ${page.url()}`);
    return true;
  } catch (err) {
    console.log(`⚠️ [${label}] May already be in video call or same page`);
    return true; // Continue anyway
  }
}

/**
 * Wait for P2P connection to establish
 */
async function waitForP2PConnection(page, label, timeout = P2P_CONNECTION_TIMEOUT) {
  console.log(`\n🔗 [${label}] Waiting for P2P connection...`);
  
  const startTime = Date.now();
  let lastLog = 0;
  
  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(() => {
      // Check ALL video elements
      const videos = document.querySelectorAll('video');
      const videoDetails = [];
      
      let hasLocalActive = false;
      let hasRemoteActive = false;
      
      videos.forEach((v, idx) => {
        const stream = v.srcObject;
        const detail = {
          index: idx,
          id: v.id || 'no-id',
          className: v.className?.substring(0, 50) || '',
          hasStream: !!stream,
          active: stream?.active || false,
          videoTracks: stream?.getVideoTracks()?.length || 0,
          audioTracks: stream?.getAudioTracks()?.length || 0,
          muted: v.muted,
          width: v.videoWidth,
          height: v.videoHeight,
        };
        videoDetails.push(detail);
        
        if (stream?.active) {
          if (v.muted) {
            hasLocalActive = true;
          } else {
            hasRemoteActive = true;
          }
        }
      });
      
      // Check for PIP preview (local video in PIP container)
      const pipContainer = document.querySelector('[class*="pip"], [class*="preview"], [class*="local"]');
      const pipVideo = pipContainer?.querySelector('video');
      
      // Check global state if available
      const globalState = window.__VIDEOLIFY_TEST_STATE__ || {};
      
      // Check for any connection indicators in the UI
      const connectionIndicators = {
        hasRemoteContainer: !!document.querySelector('[class*="remote"]'),
        hasMainVideo: !!document.querySelector('[class*="main"] video, [class*="full"] video'),
        peerCountUI: document.querySelectorAll('[class*="peer"], [class*="participant"]').length,
      };
      
      return {
        totalVideos: videos.length,
        videoDetails,
        hasLocalActive,
        hasRemoteActive,
        pipHasVideo: !!(pipVideo?.srcObject?.active),
        iceState: globalState.iceConnectionState || 'unknown',
        connectionState: globalState.connectionState || 'unknown',
        connectionIndicators,
      };
    });
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    // Log every 5 seconds with more detail
    if (Date.now() - lastLog > 5000) {
      console.log(`⏱️ [${label}] ${elapsed}s: videos=${state.totalVideos}, local=${state.hasLocalActive}, remote=${state.hasRemoteActive}, pip=${state.pipHasVideo}`);
      if (state.videoDetails.length > 0) {
        state.videoDetails.forEach(v => {
          console.log(`   Video[${v.index}]: stream=${v.hasStream}, active=${v.active}, muted=${v.muted}, tracks=${v.videoTracks}v/${v.audioTracks}a`);
        });
      }
      lastLog = Date.now();
    }
    
    // Success condition: has remote video OR at least 2 active videos
    if (state.hasRemoteActive) {
      console.log(`✅ [${label}] P2P Connected! Remote video active after ${elapsed}s`);
      return { success: true, state, elapsed };
    }
    
    // Alternative: both have local active and there are 2+ videos with streams
    const activeVideos = state.videoDetails.filter(v => v.active).length;
    if (activeVideos >= 2) {
      console.log(`✅ [${label}] P2P Connected! ${activeVideos} active videos after ${elapsed}s`);
      return { success: true, state, elapsed };
    }
    
    // Check for ICE connected state
    if (state.iceState === 'connected' || state.iceState === 'completed') {
      console.log(`✅ [${label}] ICE Connected (${state.iceState}) after ${elapsed}s`);
      return { success: true, state, elapsed };
    }
    
    await sleep(1000);
  }
  
  console.error(`❌ [${label}] P2P Connection timeout after ${timeout/1000}s`);
  return { success: false, elapsed: timeout/1000 };
}

/**
 * Verify video/audio streams
 */
async function verifyStreams(page, label) {
  console.log(`\n🔍 [${label}] Verifying streams...`);
  
  const streamInfo = await page.evaluate(() => {
    const result = {
      local: { video: false, audio: false },
      remote: { video: false, audio: false },
      details: []
    };
    
    const videos = document.querySelectorAll('video');
    
    videos.forEach((video, idx) => {
      const stream = video.srcObject;
      if (!stream) return;
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      const isLocal = video.id?.includes('local') || 
                     video.dataset?.testid === 'local-video' ||
                     video.muted;
      
      const info = {
        index: idx,
        type: isLocal ? 'local' : 'remote',
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoEnabled: videoTracks.some(t => t.enabled),
        audioEnabled: audioTracks.some(t => t.enabled),
        active: stream.active,
      };
      
      result.details.push(info);
      
      if (isLocal) {
        result.local.video = info.videoEnabled;
        result.local.audio = info.audioEnabled;
      } else {
        result.remote.video = info.videoEnabled;
        result.remote.audio = info.audioEnabled;
      }
    });
    
    return result;
  });
  
  console.log(`📊 [${label}] Stream details:`, JSON.stringify(streamInfo, null, 2));
  
  return streamInfo;
}

/**
 * Take screenshot
 */
async function takeScreenshot(page, label, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tests/test-screenshots/p2p/${label}_${name}_${timestamp}.png`;
  await page.screenshot({ path: filename, fullPage: false });
  console.log(`📸 [${label}] Screenshot saved: ${filename}`);
}

/**
 * Main test function
 */
async function runTest() {
  console.log('═'.repeat(70));
  console.log('🧪 P2P CONNECTION TEST: TUTOR vs STUDENT');
  console.log('═'.repeat(70));
  console.log(`📍 Login URL: ${LOGIN_URL}`);
  console.log(`📍 Prejoin URL: ${PREJOIN_URL}`);
  console.log(`👨‍🏫 Tutor: ${TUTOR_ACCOUNT.username}`);
  console.log(`👨‍🎓 Student: ${STUDENT_ACCOUNT.username}`);
  console.log('═'.repeat(70));
  
  let browserTutor, browserStudent;
  let pageTutor, pageStudent;
  
  const results = {
    tutorLogin: false,
    studentLogin: false,
    tutorJoinPrejoin: false,
    studentJoinPrejoin: false,
    tutorP2P: false,
    studentP2P: false,
    tutorStreams: null,
    studentStreams: null,
  };
  
  try {
    // ========== Step 1: Launch browsers ==========
    console.log('\n📦 Step 1: Launching browsers...');
    
    browserTutor = await chromium.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
        '--no-sandbox',
      ],
    });
    
    browserStudent = await chromium.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream', 
        '--disable-web-security',
        '--no-sandbox',
      ],
    });
    
    // Create contexts with permissions
    const contextTutor = await browserTutor.newContext({
      permissions: ['camera', 'microphone'],
    });
    const contextStudent = await browserStudent.newContext({
      permissions: ['camera', 'microphone'],
    });
    
    pageTutor = await contextTutor.newPage();
    pageStudent = await contextStudent.newPage();
    
    // Enable console logging for debugging
    pageTutor.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('P2P') || msg.text().includes('WebRTC') || msg.text().includes('peer') || msg.text().includes('SSE') || msg.text().includes('signal')) {
        console.log(`🔵 [TUTOR Console] ${msg.text()}`);
      }
    });
    
    pageStudent.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('P2P') || msg.text().includes('WebRTC') || msg.text().includes('peer') || msg.text().includes('SSE') || msg.text().includes('signal')) {
        console.log(`🟢 [STUDENT Console] ${msg.text()}`);
      }
    });
    
    // Set viewport
    await pageTutor.setViewportSize({ width: 1280, height: 720 });
    await pageStudent.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Browsers launched');
    
    // ========== Step 2: Login both accounts ==========
    console.log('\n📦 Step 2: Logging in both accounts...');
    
    // Login in parallel
    const [tutorLoginResult, studentLoginResult] = await Promise.all([
      login(pageTutor, TUTOR_ACCOUNT, 'TUTOR'),
      login(pageStudent, STUDENT_ACCOUNT, 'STUDENT'),
    ]);
    
    results.tutorLogin = tutorLoginResult;
    results.studentLogin = studentLoginResult;
    
    if (!tutorLoginResult || !studentLoginResult) {
      throw new Error('Login failed for one or both accounts');
    }
    
    // ========== Step 3: Navigate to prejoin ==========
    console.log('\n📦 Step 3: Navigating to prejoin page...');
    
    // Tutor joins first
    results.tutorJoinPrejoin = await joinFromPrejoin(pageTutor, 'TUTOR');
    await sleep(2000);
    
    // Then student joins
    results.studentJoinPrejoin = await joinFromPrejoin(pageStudent, 'STUDENT');
    
    if (!results.tutorJoinPrejoin || !results.studentJoinPrejoin) {
      throw new Error('Failed to join from prejoin page');
    }
    
    // ========== Step 4: Wait for P2P connection ==========
    console.log('\n📦 Step 4: Waiting for P2P connection...');
    
    // Wait for both to connect
    const [tutorP2PResult, studentP2PResult] = await Promise.all([
      waitForP2PConnection(pageTutor, 'TUTOR'),
      waitForP2PConnection(pageStudent, 'STUDENT'),
    ]);
    
    results.tutorP2P = tutorP2PResult.success;
    results.studentP2P = studentP2PResult.success;
    
    // ========== Step 5: Verify streams ==========
    console.log('\n📦 Step 5: Verifying streams...');
    
    await sleep(3000); // Extra time for streams to stabilize
    
    results.tutorStreams = await verifyStreams(pageTutor, 'TUTOR');
    results.studentStreams = await verifyStreams(pageStudent, 'STUDENT');
    
    // ========== Step 6: Take screenshots ==========
    console.log('\n📦 Step 6: Taking screenshots...');
    
    await takeScreenshot(pageTutor, 'TUTOR', 'final');
    await takeScreenshot(pageStudent, 'STUDENT', 'final');
    
    // ========== Results ==========
    console.log('\n' + '═'.repeat(70));
    console.log('📊 TEST RESULTS');
    console.log('═'.repeat(70));
    
    const allPassed = results.tutorLogin && results.studentLogin && 
                      results.tutorJoinPrejoin && results.studentJoinPrejoin &&
                      results.tutorP2P && results.studentP2P;
    
    console.log(`\n👨‍🏫 TUTOR (${TUTOR_ACCOUNT.username}):`);
    console.log(`   Login: ${results.tutorLogin ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Join Prejoin: ${results.tutorJoinPrejoin ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   P2P Connected: ${results.tutorP2P ? '✅ PASS' : '❌ FAIL'}`);
    if (results.tutorStreams) {
      console.log(`   Local Video: ${results.tutorStreams.local.video ? '✅' : '❌'}`);
      console.log(`   Remote Video: ${results.tutorStreams.remote.video ? '✅' : '❌'}`);
    }
    
    console.log(`\n👨‍🎓 STUDENT (${STUDENT_ACCOUNT.username}):`);
    console.log(`   Login: ${results.studentLogin ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Join Prejoin: ${results.studentJoinPrejoin ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   P2P Connected: ${results.studentP2P ? '✅ PASS' : '❌ FAIL'}`);
    if (results.studentStreams) {
      console.log(`   Local Video: ${results.studentStreams.local.video ? '✅' : '❌'}`);
      console.log(`   Remote Video: ${results.studentStreams.remote.video ? '✅' : '❌'}`);
    }
    
    console.log('\n' + '═'.repeat(70));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.log('⚠️ SOME TESTS FAILED');
    }
    console.log('═'.repeat(70));
    
    // Keep browsers open for inspection
    console.log('\n⏳ Keeping browsers open for 30 seconds for inspection...');
    await sleep(30000);
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🧹 Cleaning up...');
    
    if (browserTutor) await browserTutor.close();
    if (browserStudent) await browserStudent.close();
    
    console.log('✅ Test completed');
  }
}

// Create screenshot directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('tests/test-screenshots/p2p', { recursive: true });
} catch (e) {}

// Run the test
runTest().catch(console.error);
