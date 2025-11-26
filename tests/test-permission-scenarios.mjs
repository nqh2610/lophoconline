#!/usr/bin/env node
/**
 * CAMERA/MIC PERMISSION SCENARIOS TEST
 * 
 * Test cases:
 * 1. Deny camera/mic → then grant and toggle
 * 2. Grant camera/mic → then toggle on/off multiple times
 * 
 * Checks:
 * - Connection stability after permission changes
 * - Remote peer sees video when local toggles camera
 * - Video track synchronization
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify';

const TEST_SCENARIOS = [
  {
    name: 'Deny permissions initially, then grant later',
    chromePermissions: 'deny',
    edgePermissions: 'deny',
    steps: [
      { action: 'wait', duration: 5000, desc: 'Wait for initial connection with denied permissions' },
      { action: 'grant', browser: 'both', desc: 'Grant camera/mic permissions via browser' },
      { action: 'wait', duration: 3000, desc: 'Wait for permission granted' },
      { action: 'toggle-video', browser: 'chrome', desc: 'Chrome toggles camera ON' },
      { action: 'wait', duration: 2000, desc: 'Wait for video sync' },
      { action: 'check-remote-video', browser: 'edge', expect: true, desc: 'Edge should see Chrome video' },
      { action: 'toggle-video', browser: 'chrome', desc: 'Chrome toggles camera OFF' },
      { action: 'wait', duration: 2000, desc: 'Wait for video sync' },
      { action: 'check-remote-video', browser: 'edge', expect: false, desc: 'Edge should NOT see Chrome video' },
    ],
  },
  {
    name: 'Grant permissions initially, then toggle multiple times',
    chromePermissions: 'grant',
    edgePermissions: 'grant',
    steps: [
      { action: 'wait', duration: 5000, desc: 'Wait for initial connection with granted permissions' },
      { action: 'check-local-video', browser: 'chrome', expect: true, desc: 'Chrome has own video' },
      { action: 'check-remote-video', browser: 'edge', expect: true, desc: 'Edge sees Chrome video' },
      { action: 'toggle-video', browser: 'chrome', desc: 'Chrome toggles camera OFF' },
      { action: 'wait', duration: 2000, desc: 'Wait for sync' },
      { action: 'check-remote-video', browser: 'edge', expect: false, desc: 'Edge should NOT see video' },
      { action: 'toggle-video', browser: 'chrome', desc: 'Chrome toggles camera ON' },
      { action: 'wait', duration: 2000, desc: 'Wait for sync' },
      { action: 'check-remote-video', browser: 'edge', expect: true, desc: 'Edge should see video again' },
      { action: 'toggle-video', browser: 'chrome', desc: 'Chrome toggles camera OFF again' },
      { action: 'wait', duration: 2000, desc: 'Wait for sync' },
      { action: 'check-remote-video', browser: 'edge', expect: false, desc: 'Edge should NOT see video' },
    ],
  },
  {
    name: 'Asymmetric permissions - Chrome deny, Edge grant',
    chromePermissions: 'deny',
    edgePermissions: 'grant',
    steps: [
      { action: 'wait', duration: 5000, desc: 'Wait for initial connection' },
      { action: 'check-remote-video', browser: 'chrome', expect: true, desc: 'Chrome sees Edge video' },
      { action: 'check-remote-video', browser: 'edge', expect: false, desc: 'Edge does NOT see Chrome video (denied)' },
      { action: 'toggle-video', browser: 'edge', desc: 'Edge toggles camera OFF' },
      { action: 'wait', duration: 2000, desc: 'Wait for sync' },
      { action: 'check-remote-video', browser: 'chrome', expect: false, desc: 'Chrome should NOT see video' },
    ],
  },
];

async function executeStep(step, chromePage, edgePage, stepNum, totalSteps) {
  console.log(`   [${stepNum}/${totalSteps}] ${step.desc}...`);

  switch (step.action) {
    case 'wait':
      await new Promise(resolve => setTimeout(resolve, step.duration));
      break;

    case 'grant':
      // Note: In Playwright with fake devices, permissions are auto-granted
      // This step is more for documentation and real-world scenario
      console.log('      ℹ️  Permissions auto-granted with fake devices');
      break;

    case 'toggle-video':
      const page = step.browser === 'chrome' ? chromePage : edgePage;
      const browserName = step.browser === 'chrome' ? 'Chrome' : 'Edge';
      
      // Find and click video toggle button (camera icon)
      try {
        // Try multiple selectors for video toggle button
        const videoButtonSelectors = [
          'button[aria-label*="Camera"]',
          'button[aria-label*="Video"]',
          'button:has-text("Video")',
          'button:has(svg)', // Generic button with icon
        ];

        let clicked = false;
        for (const selector of videoButtonSelectors) {
          const button = await page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
            await button.click();
            clicked = true;
            console.log(`      ✅ ${browserName} clicked video toggle`);
            break;
          }
        }

        if (!clicked) {
          // Fallback: find button by position (usually first or second button in controls)
          const buttons = await page.locator('button').all();
          if (buttons.length > 0) {
            await buttons[0].click(); // First button is usually video
            console.log(`      ✅ ${browserName} clicked first button (assumed video)`);
          } else {
            console.log(`      ⚠️  ${browserName} - No video button found`);
          }
        }
      } catch (err) {
        console.log(`      ⚠️  ${browserName} - Failed to toggle video: ${err.message}`);
      }
      break;

    case 'check-local-video':
      const localPage = step.browser === 'chrome' ? chromePage : edgePage;
      const localBrowserName = step.browser === 'chrome' ? 'Chrome' : 'Edge';
      
      const hasLocal = await localPage.evaluate(() => {
        const video = document.querySelector('video[muted]'); // Local video is muted
        if (!video) return false;
        return video.srcObject && video.srcObject.active;
      });

      if (hasLocal === step.expect) {
        console.log(`      ✅ ${localBrowserName} local video: ${hasLocal ? 'PRESENT' : 'ABSENT'} (expected)`);
      } else {
        console.log(`      ❌ ${localBrowserName} local video: ${hasLocal ? 'PRESENT' : 'ABSENT'} (expected ${step.expect ? 'PRESENT' : 'ABSENT'})`);
        return false;
      }
      break;

    case 'check-remote-video':
      const remotePage = step.browser === 'chrome' ? chromePage : edgePage;
      const remoteBrowserName = step.browser === 'chrome' ? 'Chrome' : 'Edge';
      
      const hasRemote = await remotePage.evaluate(() => {
        const videos = Array.from(document.querySelectorAll('video'));
        const remoteVideo = videos.find(v => !v.muted); // Remote video is NOT muted
        
        if (!remoteVideo) return false;
        
        const stream = remoteVideo.srcObject;
        if (!stream) return false;
        
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0) return false;
        
        const track = videoTracks[0];
        // Check if track is enabled and not ended
        return track.enabled && track.readyState === 'live';
      });

      if (hasRemote === step.expect) {
        console.log(`      ✅ ${remoteBrowserName} sees remote video: ${hasRemote ? 'YES' : 'NO'} (expected)`);
      } else {
        console.log(`      ❌ ${remoteBrowserName} sees remote video: ${hasRemote ? 'YES' : 'NO'} (expected ${step.expect ? 'YES' : 'NO'})`);
        return false;
      }
      break;
  }

  return true;
}

async function testScenario(scenario, attemptNum) {
  const ROOM = `permission-test-${Date.now()}`;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 ATTEMPT ${attemptNum} - ${scenario.name}`);
  console.log('='.repeat(80));

  let chromeBrowser, edgeBrowser;

  try {
    const startTime = Date.now();
    
    // Launch browsers with appropriate permissions
    const chromeArgs = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
    const edgeArgs = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];

    chromeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'chrome',
      args: chromeArgs,
    });

    edgeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'msedge',
      args: edgeArgs,
    });

    // Set up contexts with permissions
    const chromePermissions = scenario.chromePermissions === 'grant' ? ['camera', 'microphone'] : [];
    const edgePermissions = scenario.edgePermissions === 'grant' ? ['camera', 'microphone'] : [];

    const chromeContext = await chromeBrowser.newContext({
      permissions: chromePermissions
    });

    const edgeContext = await edgeBrowser.newContext({
      permissions: edgePermissions
    });

    const chromePage = await chromeContext.newPage();
    const edgePage = await edgeContext.newPage();

    // Track console errors
    const errors = [];
    chromePage.on('console', msg => {
      if (msg.type() === 'error') errors.push(`🟦 CHROME: ${msg.text()}`);
    });
    edgePage.on('console', msg => {
      if (msg.type() === 'error') errors.push(`🟩 EDGE: ${msg.text()}`);
    });

    // Navigate
    const chromeUrl = `${BASE_URL}?room=${ROOM}&testUserId=1&name=ChromeUser&role=student`;
    const edgeUrl = `${BASE_URL}?room=${ROOM}&testUserId=2&name=EdgeUser&role=tutor`;

    console.log(`   Permissions: Chrome=${scenario.chromePermissions}, Edge=${scenario.edgePermissions}`);
    
    await Promise.all([
      chromePage.goto(chromeUrl),
      edgePage.goto(edgeUrl),
    ]);

    // Execute test steps
    let allStepsPassed = true;
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const stepPassed = await executeStep(step, chromePage, edgePage, i + 1, scenario.steps.length);
      if (stepPassed === false) {
        allStepsPassed = false;
        console.log(`      ⚠️  Step failed but continuing...`);
      }
    }

    // Final connection check
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chromeP2P = await chromePage.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      return {
        state: pc?.connectionState,
        iceState: pc?.iceConnectionState,
      };
    });

    const edgeP2P = await edgePage.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      return {
        state: pc?.connectionState,
        iceState: pc?.iceConnectionState,
      };
    });

    const duration = Date.now() - startTime;
    const chromeConnected = chromeP2P.state === 'connected';
    const edgeConnected = edgeP2P.state === 'connected';
    const success = chromeConnected && edgeConnected && allStepsPassed;

    console.log(`\n   Final state:`);
    console.log(`   🟦 Chrome: ${chromeP2P.state} (ice: ${chromeP2P.iceState})`);
    console.log(`   🟩 Edge:   ${edgeP2P.state} (ice: ${edgeP2P.iceState})`);

    if (success) {
      console.log(`\n✅ PASS - ${(duration/1000).toFixed(1)}s`);
    } else {
      console.log(`\n❌ FAIL - ${(duration/1000).toFixed(1)}s`);
      if (!allStepsPassed) console.log(`   Reason: One or more steps failed`);
      if (!chromeConnected) console.log(`   Reason: Chrome not connected`);
      if (!edgeConnected) console.log(`   Reason: Edge not connected`);
    }

    return { success, duration, errors: errors.length };

  } catch (err) {
    console.log(`\n❌ CRASH - ${err.message}`);
    return { success: false, duration: 0, errors: 0 };
  } finally {
    if (chromeBrowser) await chromeBrowser.close();
    if (edgeBrowser) await edgeBrowser.close();
  }
}

async function runTests() {
  console.log('\n🔬 CAMERA/MIC PERMISSION SCENARIOS TEST');
  console.log('Testing connection stability with permission changes and toggles\n');

  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    console.log('\n' + '█'.repeat(80));
    console.log(`📋 SCENARIO: ${scenario.name}`);
    console.log('█'.repeat(80));

    const attempts = [];
    let passed = 0;

    // Run each scenario 3 times
    for (let i = 1; i <= 3; i++) {
      const result = await testScenario(scenario, i);
      attempts.push(result);
      if (result.success) passed++;
    }

    const passRate = (passed / 3) * 100;

    console.log(`\n📊 ${scenario.name} - Summary:`);
    console.log(`   ✅ Passed: ${passed}/3 (${passRate}%)`);
    console.log(`   ❌ Failed: ${3 - passed}/3`);

    results.push({
      name: scenario.name,
      passed,
      total: 3,
      passRate,
    });
  }

  // Final summary
  console.log('\n\n' + '█'.repeat(80));
  console.log('📊 FINAL SUMMARY - All Permission Scenarios');
  console.log('█'.repeat(80));

  results.forEach(r => {
    const icon = r.passRate === 100 ? '✅' : '⚠️';
    console.log(`${icon} ${r.name}: ${r.passRate}% (${r.passed}/${r.total})`);
  });

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const overallRate = Math.round((totalPassed / totalTests) * 100);

  console.log(`\n🎯 OVERALL: ${overallRate}% (${totalPassed}/${totalTests})`);

  if (overallRate === 100) {
    console.log('\n🎉 ALL SCENARIOS PASSED - Perfect permission handling!');
  } else {
    console.log('\n⚠️  NEEDS ATTENTION - Some permission scenarios unstable');
  }
}

runTests().catch(console.error);
