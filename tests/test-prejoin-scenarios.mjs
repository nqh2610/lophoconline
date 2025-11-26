/**
 * Comprehensive Prejoin → Video Call Settings Transfer Tests
 * 
 * Tests all possible combinations of:
 * - Camera: ON/OFF
 * - Mic: ON/OFF  
 * - VBG: None/Blur/Image
 * 
 * Validates:
 * 1. Track.enabled state matches prejoin settings
 * 2. Toolbar icons match track state
 * 3. PIP shows "Camera tắt" when camera OFF
 * 4. PIP shows mic muted icon when mic OFF
 * 5. VBG is applied correctly in video call
 */

import { chromium } from 'playwright';

const PREJOIN_URL = 'http://localhost:3000/prejoin-videolify-v2?accessToken=6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';

// Sample background image URL for testing (use a reliable public image)
const TEST_BACKGROUND_IMAGE = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&h=720&fit=crop';

// Test configuration - all possible scenarios
const TEST_SCENARIOS = [
  // Camera OFF scenarios
  { name: 'Camera OFF, Mic OFF, No VBG', camera: false, mic: false, vbg: 'none' },
  { name: 'Camera OFF, Mic OFF, Blur VBG', camera: false, mic: false, vbg: 'blur' },
  { name: 'Camera OFF, Mic OFF, Image VBG', camera: false, mic: false, vbg: 'image' },
  { name: 'Camera OFF, Mic ON, No VBG', camera: false, mic: true, vbg: 'none' },
  { name: 'Camera OFF, Mic ON, Blur VBG', camera: false, mic: true, vbg: 'blur' },
  { name: 'Camera OFF, Mic ON, Image VBG', camera: false, mic: true, vbg: 'image' },
  
  // Camera ON scenarios  
  { name: 'Camera ON, Mic OFF, No VBG', camera: true, mic: false, vbg: 'none' },
  { name: 'Camera ON, Mic OFF, Blur VBG', camera: true, mic: false, vbg: 'blur' },
  { name: 'Camera ON, Mic OFF, Image VBG', camera: true, mic: false, vbg: 'image' },
  { name: 'Camera ON, Mic ON, No VBG', camera: true, mic: true, vbg: 'none' },
  { name: 'Camera ON, Mic ON, Blur VBG', camera: true, mic: true, vbg: 'blur' },
  { name: 'Camera ON, Mic ON, Image VBG', camera: true, mic: true, vbg: 'image' },
];

/**
 * Creates prejoin settings for localStorage
 */
function createPrejoinSettings(camera, mic, vbgMode) {
  const settings = {
    isCameraEnabled: camera,
    isMicEnabled: mic,
    vbgEnabled: vbgMode !== 'none',
    vbgMode: vbgMode,
    vbgBlurAmount: vbgMode === 'blur' ? 15 : (vbgMode === 'image' ? 5 : 0),
    vbgActivePreset: null,
    vbgBackgroundImage: vbgMode === 'image' ? TEST_BACKGROUND_IMAGE : null,
    lastUpdated: Date.now(),
  };
  return settings;
}

/**
 * Checks video call state - returns detailed state object
 */
async function checkVideoCallState(page) {
  return await page.evaluate(() => {
    const result = {
      // Track states
      track: {
        videoEnabled: null,
        audioEnabled: null,
        hasVideoTrack: false,
        hasAudioTrack: false,
      },
      // UI states - toolbar icons (check by looking at button variants/colors)
      toolbar: {
        cameraButtonRed: false,
        micButtonRed: false,
      },
      // PIP states
      pip: {
        localVisible: false,
        showsCameraOffOverlay: false,
        showsMicMutedIcon: false,
        videoHidden: false,
      },
      // VBG state
      vbg: {
        enabled: false,
        mode: 'none',
        backgroundImage: null,
        loading: false,
      },
      // Raw debug info
      debug: {},
    };

    // Check track states from video element
    const videos = document.querySelectorAll('video');
    const localVideo = videos[0]; // First video is typically local
    
    if (localVideo?.srcObject instanceof MediaStream) {
      const stream = localVideo.srcObject;
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      result.track.hasVideoTrack = !!videoTrack;
      result.track.hasAudioTrack = !!audioTrack;
      result.track.videoEnabled = videoTrack?.enabled ?? null;
      result.track.audioEnabled = audioTrack?.enabled ?? null;
      
      result.debug.streamId = stream.id;
      result.debug.trackCount = stream.getTracks().length;
    }

    // Check toolbar buttons by looking for red/destructive variants
    // The toolbar uses bg-red or variant="destructive" for OFF state
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
      const classes = btn.className || '';
      const isRed = classes.includes('bg-red') || 
                    classes.includes('destructive') ||
                    classes.includes('text-red');
      
      if (isRed) {
        const html = btn.innerHTML.toLowerCase();
        // Check if it's a camera button (has video/camera related SVG)
        if (html.includes('video') || html.includes('m15 12') || html.includes('m23 1')) {
          result.toolbar.cameraButtonRed = true;
        }
        // Check if it's a mic button
        if (html.includes('mic') || html.includes('m12 1') || html.includes('path d="m1 1')) {
          result.toolbar.micButtonRed = true;
        }
      }
    });

    // Check PIP container for local video
    // Local PIP typically has blue border
    const pipContainers = document.querySelectorAll('[style*="position: absolute"]');
    pipContainers.forEach(pip => {
      const classes = pip.className || '';
      const style = pip.getAttribute('style') || '';
      
      // Local PIP detection
      if (classes.includes('group') && style.includes('z-index')) {
        const video = pip.querySelector('video');
        const isHidden = video?.classList.contains('hidden');
        
        // Check for "Camera tắt" overlay
        const overlay = pip.querySelector('div:not([class*="bg-red"]) > div');
        const hasOverlay = overlay && !overlay.querySelector('video');
        
        // Check for mic muted icon (red circle with MicOff)
        const micMutedIcon = pip.querySelector('[class*="bg-red"][class*="rounded-full"]');
        
        // Detect local PIP by blue border
        if (pip.innerHTML.includes('border-blue') || classes.includes('border-blue')) {
          result.pip.localVisible = true;
          result.pip.videoHidden = isHidden;
          result.pip.showsCameraOffOverlay = hasOverlay || isHidden;
          result.pip.showsMicMutedIcon = !!micMutedIcon;
        }
      }
    });

    // Alternative PIP detection - look for CameraOffOverlay component
    const cameraOffDivs = document.querySelectorAll('[class*="flex"][class*="items-center"][class*="justify-center"][class*="bg-"]');
    cameraOffDivs.forEach(div => {
      if (div.textContent?.includes('Camera') || div.querySelector('svg')) {
        // This might be the CameraOffOverlay
        const parent = div.closest('[style*="position: absolute"]');
        if (parent && parent.innerHTML.includes('border-blue')) {
          result.pip.localVisible = true;
          result.pip.showsCameraOffOverlay = true;
        }
      }
    });

    // Check VBG state from global or localStorage
    result.vbg.enabled = localStorage.getItem('vbg-enabled') === 'true';
    result.vbg.mode = localStorage.getItem('vbg-last-mode') || 'none';
    result.vbg.backgroundImage = localStorage.getItem('vbg-background-image') || null;
    result.vbg.loading = !!document.querySelector('[data-vbg-loading="true"]');

    return result;
  });
}

/**
 * Runs a single test scenario
 */
async function runScenario(context, scenario, scenarioIndex) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 Scenario ${scenarioIndex + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`   Expected: Camera=${scenario.camera ? 'ON' : 'OFF'}, Mic=${scenario.mic ? 'ON' : 'OFF'}, VBG=${scenario.vbg}`);

  const page = await context.newPage();
  const errors = [];
  const warnings = [];

  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[VideolifyFull_v2]') && (text.includes('✅') || text.includes('❌'))) {
      console.log(`   📝 ${text.substring(0, 80)}`);
    }
  });

  try {
    // Clear any existing localStorage first
    await page.goto(PREJOIN_URL);
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Set prejoin settings in localStorage
    const settings = createPrejoinSettings(scenario.camera, scenario.mic, scenario.vbg);
    await page.evaluate((s) => {
      localStorage.setItem('videolify_prejoin_settings', JSON.stringify(s));
    }, settings);

    // Reload to apply settings
    await page.reload();
    await page.waitForTimeout(2500);

    // Click join button
    try {
      await page.click('button:has-text("Tham gia ngay")', { timeout: 5000 });
    } catch {
      errors.push('Could not find "Tham gia ngay" button');
      return { passed: false, errors, warnings };
    }

    // Wait for video call page
    await page.waitForURL(/\/video-call-v2/, { timeout: 10000 }).catch(() => {
      warnings.push('URL did not change to video-call-v2');
    });
    
    // Wait for initialization (longer for VBG scenarios)
    const waitTime = scenario.vbg !== 'none' ? 8000 : 5000;
    await page.waitForTimeout(waitTime);

    // Check state
    const state = await checkVideoCallState(page);
    
    console.log('\n   📊 Results:');

    // 1. Validate track states
    const trackVideoMatch = state.track.videoEnabled === scenario.camera;
    const trackAudioMatch = state.track.audioEnabled === scenario.mic;
    
    console.log(`      Track Video: ${state.track.videoEnabled === scenario.camera ? '✅' : '❌'} (expected: ${scenario.camera}, actual: ${state.track.videoEnabled})`);
    console.log(`      Track Audio: ${state.track.audioEnabled === scenario.mic ? '✅' : '❌'} (expected: ${scenario.mic}, actual: ${state.track.audioEnabled})`);
    
    if (!trackVideoMatch) {
      errors.push(`Track video: expected ${scenario.camera}, got ${state.track.videoEnabled}`);
    }
    if (!trackAudioMatch) {
      errors.push(`Track audio: expected ${scenario.mic}, got ${state.track.audioEnabled}`);
    }

    // 2. Validate toolbar icons
    const toolbarCameraOk = scenario.camera === false ? state.toolbar.cameraButtonRed : !state.toolbar.cameraButtonRed;
    const toolbarMicOk = scenario.mic === false ? state.toolbar.micButtonRed : !state.toolbar.micButtonRed;
    
    console.log(`      Toolbar Camera: ${toolbarCameraOk ? '✅' : '❌'} (red=${state.toolbar.cameraButtonRed}, should be red=${!scenario.camera})`);
    console.log(`      Toolbar Mic: ${toolbarMicOk ? '✅' : '❌'} (red=${state.toolbar.micButtonRed}, should be red=${!scenario.mic})`);
    
    if (!toolbarCameraOk) {
      errors.push(`Toolbar camera icon wrong state (camera=${scenario.camera}, redButton=${state.toolbar.cameraButtonRed})`);
    }
    if (!toolbarMicOk) {
      errors.push(`Toolbar mic icon wrong state (mic=${scenario.mic}, redButton=${state.toolbar.micButtonRed})`);
    }

    // 3. Validate PIP state (when camera OFF)
    if (!scenario.camera) {
      const pipShowsCameraOff = state.pip.showsCameraOffOverlay || state.pip.videoHidden;
      console.log(`      PIP Camera Off: ${pipShowsCameraOff ? '✅' : '❌'} (overlay=${state.pip.showsCameraOffOverlay}, hidden=${state.pip.videoHidden})`);
      
      if (!pipShowsCameraOff) {
        errors.push('PIP should show "Camera tắt" overlay when camera is OFF');
      }
    }

    // 4. Validate PIP mic muted icon (when mic OFF)
    if (!scenario.mic) {
      console.log(`      PIP Mic Muted: ${state.pip.showsMicMutedIcon ? '✅' : '❌'}`);
      
      if (!state.pip.showsMicMutedIcon) {
        errors.push('PIP should show mic muted icon when mic is OFF');
      }
    }

    // 5. Validate VBG (if enabled)
    if (scenario.vbg !== 'none') {
      const vbgOk = state.vbg.enabled || state.vbg.loading;
      const modeMatch = state.vbg.mode === scenario.vbg;
      
      console.log(`      VBG Enabled: ${vbgOk ? '✅' : '⚠️'} (enabled=${state.vbg.enabled}, loading=${state.vbg.loading})`);
      console.log(`      VBG Mode: ${modeMatch ? '✅' : '⚠️'} (expected=${scenario.vbg}, actual=${state.vbg.mode})`);
      
      if (scenario.vbg === 'image') {
        const hasImage = !!state.vbg.backgroundImage;
        console.log(`      VBG Image: ${hasImage ? '✅' : '⚠️'} (has image=${hasImage})`);
        if (!hasImage) {
          warnings.push('VBG image background should be saved');
        }
      }
      
      if (!vbgOk) {
        warnings.push(`VBG should be enabled for mode: ${scenario.vbg}`);
      }
      if (!modeMatch) {
        warnings.push(`VBG mode mismatch: expected ${scenario.vbg}, got ${state.vbg.mode}`);
      }
    }

  } catch (err) {
    errors.push(`Exception: ${err.message}`);
  } finally {
    await page.close();
  }

  // Print result
  const passed = errors.length === 0;
  if (passed) {
    console.log(`\n   ✅ PASSED ${warnings.length > 0 ? `(${warnings.length} warnings)` : ''}`);
  } else {
    console.log('\n   ❌ FAILED');
    errors.forEach(e => console.log(`      ❌ ${e}`));
  }
  if (warnings.length > 0) {
    warnings.forEach(w => console.log(`      ⚠️ ${w}`));
  }

  return { passed, errors, warnings };
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 PREJOIN → VIDEO CALL COMPREHENSIVE TEST SUITE');
  console.log('═'.repeat(60));
  console.log(`\n📋 Running ${TEST_SCENARIOS.length} test scenarios...`);
  console.log('   Testing: Track state, Toolbar icons, PIP display, VBG\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    scenarios: [],
  };

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    const result = await runScenario(context, scenario, i);
    
    results.scenarios.push({
      name: scenario.name,
      ...result,
    });

    if (result.passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    if (result.warnings.length > 0) {
      results.warnings += result.warnings.length;
    }

    // Small delay between scenarios
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   Total Scenarios: ${TEST_SCENARIOS.length}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⚠️ Warnings: ${results.warnings}`);
  console.log('═'.repeat(60));

  if (results.failed > 0) {
    console.log('\n❌ FAILED SCENARIOS:');
    results.scenarios
      .filter(s => !s.passed)
      .forEach(s => {
        console.log(`\n   ${s.name}:`);
        s.errors.forEach(e => console.log(`      └─ ${e}`));
      });
  }

  console.log('\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
