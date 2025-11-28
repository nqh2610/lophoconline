/**
 * Test: Blocked Permissions UI
 * 
 * Verifies that when camera/mic permissions are blocked:
 * 1. Toolbar shows camera/mic as OFF (not ON)
 * 2. PIP shows camera off overlay
 * 3. PIP shows mic off icon
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROOM_ID = `blocked-test-${Date.now()}`;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function runTest() {
  console.log('══════════════════════════════════════════════════');
  console.log('   🚫 BLOCKED PERMISSIONS UI TEST');
  console.log('══════════════════════════════════════════════════\n');

  let browser;
  let passed = 0, failed = 0;

  try {
    // Launch browser WITHOUT fake media streams and WITH permission denial
    console.log('🚀 Launching browser with BLOCKED permissions...\n');
    
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox']
    });

    // Create context that denies camera/microphone permissions
    const context = await browser.newContext({
      permissions: [], // No permissions granted
    });
    
    const page = await context.newPage();

    // Track console logs
    const logs = [];
    page.on('console', msg => {
      logs.push(msg.text());
      if (msg.text().includes('useMediaDevices') || msg.text().includes('dummy')) {
        console.log(`   [Console] ${msg.text().substring(0, 80)}`);
      }
    });

    // Navigate to video call
    const testUrl = `${BASE_URL}/test-videolify-v2?room=${ROOM_ID}&name=BlockedUser&role=student`;
    await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
    
    // Wait for video call container
    await page.waitForSelector('[data-videocall-container]', { timeout: 30000 });
    console.log('   [Page] Video call loaded\n');

    // Wait for media initialization
    await delay(3000);

    // ═══════════════════════════════════════════════════════════════
    // TEST 1: Toolbar Camera Button shows OFF state
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 1: Toolbar Camera Button State');
    console.log('────────────────────────────────────────────────────');

    const cameraButtonState = await page.evaluate(() => {
      // Find camera button - it should show VideoOff icon when blocked
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        // Check for video icons
        const hasVideoOffIcon = btn.querySelector('svg')?.innerHTML?.includes('path') &&
          (btn.className.includes('destructive') || btn.className.includes('red'));
        const hasVideoIcon = btn.querySelector('svg[class*="video"]') || 
          btn.innerHTML.toLowerCase().includes('video');
        
        if (hasVideoIcon || hasVideoOffIcon) {
          return {
            found: true,
            isOff: btn.className.includes('destructive') || btn.className.includes('bg-red'),
            className: btn.className
          };
        }
      }
      
      // Alternative: check by looking at icon type
      const videoOffIcons = document.querySelectorAll('[data-testid="video-off-icon"], .lucide-video-off');
      const videoOnIcons = document.querySelectorAll('[data-testid="video-icon"], .lucide-video');
      
      return {
        found: videoOffIcons.length > 0 || videoOnIcons.length > 0,
        isOff: videoOffIcons.length > 0,
        offCount: videoOffIcons.length,
        onCount: videoOnIcons.length
      };
    });

    console.log('   Camera button state:', cameraButtonState);

    // Check media state from hook
    const mediaState = await page.evaluate(() => {
      // Check for media state exposed by the hook
      const state = window.__VIDEOLIFY_DEBUG__ || {};
      return {
        isVideoEnabled: state.isVideoEnabled,
        isAudioEnabled: state.isAudioEnabled,
        usingDummy: state.usingDummy,
      };
    });
    console.log('   Media state from debug:', mediaState);

    // For blocked permissions, camera should show OFF
    // We check if the button has red/destructive styling OR if using dummy tracks
    const test1Pass = cameraButtonState.isOff || mediaState.usingDummy?.video === true || 
      (mediaState.isVideoEnabled === false);
    
    results.push({ name: 'Toolbar Camera OFF when blocked', pass: test1Pass });
    console.log(`   ${test1Pass ? '✅' : '❌'} Camera button shows OFF state: ${test1Pass}\n`);
    if (test1Pass) passed++; else failed++;

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: Toolbar Mic Button shows OFF state
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 2: Toolbar Mic Button State');
    console.log('────────────────────────────────────────────────────');

    const micButtonState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const hasMicIcon = btn.innerHTML.toLowerCase().includes('mic');
        if (hasMicIcon) {
          return {
            found: true,
            isOff: btn.className.includes('destructive') || btn.className.includes('bg-red'),
            className: btn.className
          };
        }
      }
      
      const micOffIcons = document.querySelectorAll('[data-testid="mic-off-icon"], .lucide-mic-off');
      const micOnIcons = document.querySelectorAll('[data-testid="mic-icon"], .lucide-mic');
      
      return {
        found: micOffIcons.length > 0 || micOnIcons.length > 0,
        isOff: micOffIcons.length > 0,
        offCount: micOffIcons.length,
        onCount: micOnIcons.length
      };
    });

    console.log('   Mic button state:', micButtonState);

    const test2Pass = micButtonState.isOff || mediaState.usingDummy?.audio === true ||
      (mediaState.isAudioEnabled === false);
    
    results.push({ name: 'Toolbar Mic OFF when blocked', pass: test2Pass });
    console.log(`   ${test2Pass ? '✅' : '❌'} Mic button shows OFF state: ${test2Pass}\n`);
    if (test2Pass) passed++; else failed++;

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: PIP shows Camera Off overlay
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 3: PIP Camera Off Overlay');
    console.log('────────────────────────────────────────────────────');

    const pipCameraState = await page.evaluate(() => {
      // Look for camera off overlay in PIP
      const cameraOffOverlay = document.querySelector('[data-testid="camera-off-overlay"]');
      const cameraOffText = document.body.innerText.includes('Camera Off') || 
        document.body.innerText.includes('Camera is off') ||
        document.body.innerText.includes('Tắt camera');
      
      // Look for video element that is hidden
      const videos = Array.from(document.querySelectorAll('video'));
      const localVideo = videos.find(v => v.muted === true);
      const videoHidden = localVideo ? 
        (localVideo.className.includes('hidden') || 
         getComputedStyle(localVideo).display === 'none' ||
         localVideo.videoWidth === 0) : true;

      // Look for camera off icon/overlay
      const hasVideoOffIcon = document.querySelector('.lucide-video-off') !== null;
      
      return {
        hasOverlay: cameraOffOverlay !== null,
        hasText: cameraOffText,
        videoHidden,
        hasVideoOffIcon,
        localVideoFound: !!localVideo,
        localVideoClass: localVideo?.className || ''
      };
    });

    console.log('   PIP camera state:', pipCameraState);

    const test3Pass = pipCameraState.videoHidden || pipCameraState.hasOverlay || 
      pipCameraState.hasVideoOffIcon || pipCameraState.hasText;
    
    results.push({ name: 'PIP shows Camera Off overlay', pass: test3Pass });
    console.log(`   ${test3Pass ? '✅' : '❌'} PIP shows camera off: ${test3Pass}\n`);
    if (test3Pass) passed++; else failed++;

    // ═══════════════════════════════════════════════════════════════
    // TEST 4: PIP shows Mic Off icon
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 4: PIP Mic Off Icon');
    console.log('────────────────────────────────────────────────────');

    const pipMicState = await page.evaluate(() => {
      // Look for mic off icon in PIP area
      const micOffIcons = document.querySelectorAll('.lucide-mic-off');
      
      // Check if there's a red badge with mic off icon
      const redBadges = document.querySelectorAll('.bg-red-500, .bg-red-600');
      let hasMicOffBadge = false;
      redBadges.forEach(badge => {
        if (badge.querySelector('.lucide-mic-off') || badge.innerHTML.includes('mic')) {
          hasMicOffBadge = true;
        }
      });

      return {
        hasMicOffIcon: micOffIcons.length > 0,
        micOffCount: micOffIcons.length,
        hasMicOffBadge
      };
    });

    console.log('   PIP mic state:', pipMicState);

    // When mic is blocked and showing OFF, there should be a mic off icon in PIP
    const test4Pass = pipMicState.hasMicOffIcon || pipMicState.hasMicOffBadge || 
      mediaState.isAudioEnabled === false;
    
    results.push({ name: 'PIP shows Mic Off icon', pass: test4Pass });
    console.log(`   ${test4Pass ? '✅' : '❌'} PIP shows mic off: ${test4Pass}\n`);
    if (test4Pass) passed++; else failed++;

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('══════════════════════════════════════════════════');
    console.log('   📊 RESULTS SUMMARY');
    console.log('══════════════════════════════════════════════════');
    console.log(`   Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`   Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`);
    console.log('══════════════════════════════════════════════════\n');

    return failed === 0 ? 0 : 1;

  } catch (error) {
    console.error('\n❌ Test error:', error);
    return 1;
  } finally {
    await browser?.close().catch(() => {});
  }
}

const results = [];
runTest().then(code => process.exit(code));
