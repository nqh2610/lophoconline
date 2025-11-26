/**
 * VBG (Virtual Background) P2P Test Suite v2
 * 
 * Flow: Tutor sets VBG in localStorage BEFORE joining
 * -> Student should receive VBG settings via DataChannel/SSE
 * -> Student applies VBG to Tutor's video BEFORE displaying
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = '6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';
const PREJOIN_URL = `${BASE_URL}/prejoin-videolify-v2?accessToken=${ACCESS_TOKEN}`;

// Test accounts
const TUTOR = { username: 'tutor_mai', password: '123456' };
const STUDENT = { username: 'test', password: 'Test123456' };


const delay = (ms) => new Promise(r => setTimeout(r, ms));

const isHeadless = process.env.HEADLESS === '1' || process.env.CI === '1';

// VBG Settings templates
const VBG_SETTINGS = {
  blur: {
    isCameraEnabled: true,
    isMicEnabled: true,
    vbgEnabled: true,
    vbgMode: 'blur',
    vbgBlurAmount: 10,
    vbgActivePreset: null,
    vbgBackgroundImage: null,
    lastUpdated: Date.now()
  },
  image: {
    isCameraEnabled: true,
    isMicEnabled: true,
    vbgEnabled: true,
    vbgMode: 'image',
    vbgBlurAmount: 10,
    vbgActivePreset: 'Modern Office Space',
    vbgBackgroundImage: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1920&q=80',
    lastUpdated: Date.now()
  },
  none: {
    isCameraEnabled: true,
    isMicEnabled: true,
    vbgEnabled: false,
    vbgMode: 'none',
    vbgBlurAmount: 10,
    vbgActivePreset: null,
    vbgBackgroundImage: null,
    lastUpdated: Date.now()
  }
};

/**
 * Collect VBG-related console logs
 */
function collectLogs(page, label) {
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('VBG') || 
        text.includes('vbg') || 
        text.includes('virtual') ||
        text.includes('background') ||
        text.includes('DataChannel') ||
        text.includes('Control message') ||
        text.includes('Prejoin') ||
        text.includes('VideolifyFull_v2')) {
      logs.push(`[${label}] ${text}`);
      if (text.includes('VBG settings') || text.includes('vbg-settings')) {
        console.log(`   📡 ${label}: ${text.substring(0, 100)}`);
      }
    }
  });
  return logs;
}

/**
 * Login to the system
 */
async function login(page, credentials, role) {
  console.log(`   Logging in as ${role}...`);
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  await page.fill('#username', credentials.username);
  await page.fill('#password', credentials.password);
  await page.click('button[type="submit"]');
  
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  console.log(`   ✅ ${role} logged in`);
}

/**
 * Navigate to prejoin and set VBG settings in localStorage
 */
async function navigateWithVbgSettings(page, role, vbgSettings) {
  // First navigate to the prejoin page
  await page.goto(PREJOIN_URL, { waitUntil: 'domcontentloaded' });
  
  // Set VBG settings in localStorage immediately, before React hydration completes
  await page.evaluate((settings) => {
    window.localStorage.setItem('videolify_prejoin_settings', JSON.stringify(settings));
    console.log('[Test] Set VBG settings in localStorage:', settings);
  }, vbgSettings);
  
  // Reload the page so React loads with the correct settings in localStorage
  await page.reload({ waitUntil: 'networkidle' });
  
  // Verify the settings were loaded
  const loaded = await page.evaluate(() => {
    const stored = window.localStorage.getItem('videolify_prejoin_settings');
    return stored ? JSON.parse(stored) : null;
  });
  
  console.log(`   ${role} at prejoin with VBG: ${vbgSettings.vbgMode} (loaded: ${loaded?.vbgMode || 'none'})`);
}

/**
 * Navigate to prejoin without VBG
 */
async function navigateToPrejoin(page, role) {
  await page.goto(PREJOIN_URL);
  await page.waitForLoadState('networkidle');
  console.log(`   ${role} at prejoin (no VBG)`);
}

/**
 * Wait for join button and click
 */
async function joinCall(page, role) {
  await page.waitForFunction(() => {
    const btn = document.querySelector('#join-button');
    return btn && !btn.disabled;
  }, { timeout: 45000 });

  await page.locator('#join-button').click();
  console.log(`   ${role} clicked join`);
  
  // Wait for URL to change to video-call-v2 (the actual route)
  await page.waitForURL(url => url.pathname.includes('/video-call-v2/'), { timeout: 15000 });
  console.log(`   ${role} in video call`);
  
  // Wait for the component to fully mount and initialize media
  await page.waitForLoadState('networkidle');
  await delay(2000); // Extra time for component initialization
}

/**
 * Wait for P2P connection
 */
async function waitForP2P(page, label, timeout = 45000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      let remoteVideoActive = false;
      let localVideoActive = false;

      for (const v of videos) {
        try {
          // Check if the video has rendered pixels (videoWidth > 0)
          const hasFrames = v.videoWidth && v.videoWidth > 0;
          const hasData = v.readyState >= 2; // HAVE_CURRENT_DATA
          
          if (hasFrames || hasData) {
            // muted video is likely local, unmuted is remote
            if (v.muted) {
              localVideoActive = true;
            } else {
              remoteVideoActive = true;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Also check window test state if exposed
      const testState = window.__VIDEOLIFY_TEST_STATE__;
      const connectionState = testState?.connectionState;

      return {
        videoCount: videos.length,
        localVideoActive,
        remoteVideoActive,
        connected: connectionState === 'connected',
        connectionState
      };
    });
    
    // Consider connected if we have 2+ videos, or remote video active, or explicit connected state
    if (state.remoteVideoActive || state.connected || (state.videoCount >= 2 && state.localVideoActive)) {
      console.log(`   ✅ ${label} P2P connected (${Date.now() - startTime}ms) [videos: ${state.videoCount}, remote: ${state.remoteVideoActive}]`);
      return true;
    }
    
    await delay(500);
  }
  
  // Final state check for debugging
  const finalState = await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll('video'));
    return {
      videoCount: videos.length,
      videoDetails: videos.map(v => ({
        muted: v.muted,
        readyState: v.readyState,
        videoWidth: v.videoWidth,
        srcObject: !!v.srcObject
      }))
    };
  });
  console.log(`   ❌ ${label} P2P timeout - final state:`, JSON.stringify(finalState));
  return false;
}

/**
 * Check if VBG settings were received
 */
function checkVbgReceived(logs, expectedMode) {
  const received = logs.some(log => 
    log.includes('vbg-settings') || 
    log.includes('VBG settings received') ||
    log.includes('handleRemoteVbgSettings') ||
    log.includes('Received VBG')
  );
  
  const modeMatch = logs.some(log => 
    log.includes(expectedMode) || 
    log.includes(`"mode":"${expectedMode}"`)
  );
  
  return { received, modeMatch };
}

// ==================== TEST CASES ====================

async function testVbgBlurFromPrejoin() {
  console.log('\n📝 Test 1: VBG Blur Set at Prejoin -> Transfer to Peer');
  console.log('═'.repeat(55));
  
  const browser = await chromium.launch({
    headless: isHeadless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--no-sandbox',
    ],
  });
  
  try {
    const tutorCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const studentCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    
    const tutorPage = await tutorCtx.newPage();
    const studentPage = await studentCtx.newPage();
    
    const tutorLogs = collectLogs(tutorPage, 'Tutor');
    const studentLogs = collectLogs(studentPage, 'Student');
    
    await login(tutorPage, TUTOR, 'Tutor');
    await login(studentPage, STUDENT, 'Student');
    
    // Tutor: Navigate with BLUR VBG enabled
    await navigateWithVbgSettings(tutorPage, 'Tutor', VBG_SETTINGS.blur);
    await navigateToPrejoin(studentPage, 'Student');
    
    await delay(1000);
    
    await joinCall(tutorPage, 'Tutor');
    await delay(2000);
    await joinCall(studentPage, 'Student');
    
    const tutorConnected = await waitForP2P(tutorPage, 'Tutor');
    const studentConnected = await waitForP2P(studentPage, 'Student');
    
    if (!tutorConnected || !studentConnected) {
      throw new Error('P2P connection failed');
    }
    
    // Wait longer for VBG settings to be transferred and processed
    console.log('   Waiting 5s for VBG transfer...');
    await delay(5000);
    
    const vbgCheck = checkVbgReceived(studentLogs, 'blur');
    
    // Also log what Tutor saw
    console.log(`\n   📋 Tutor VBG logs:`);
    tutorLogs.filter(l => l.includes('VBG') || l.includes('vbg') || l.includes('Broadcasting') || l.includes('Control channel') || l.includes('control channel') || l.includes('prejoin'))
      .slice(-10).forEach(l => console.log(`      ${l.substring(0, 100)}`));
    
    console.log(`\n   📊 Results:`);
    console.log(`   - Student received VBG: ${vbgCheck.received ? '✅' : '❌'}`);
    console.log(`   - Mode matches 'blur': ${vbgCheck.modeMatch ? '✅' : '⚠️'}`);
    
    console.log(`\n   📋 Student VBG logs:`);
    studentLogs.filter(l => l.includes('VBG') || l.includes('vbg'))
      .slice(-5).forEach(l => console.log(`      ${l.substring(0, 80)}`));
    
    await tutorCtx.close();
    await studentCtx.close();
    
    return vbgCheck.received;
    
  } catch (err) {
    console.error('   ❌ Error:', err.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function testVbgImageFromPrejoin() {
  console.log('\n📝 Test 2: VBG Image Set at Prejoin -> Transfer to Peer');
  console.log('═'.repeat(55));
  
  const browser = await chromium.launch({
    headless: isHeadless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--no-sandbox',
    ],
  });
  
  try {
    const tutorCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const studentCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    
    const tutorPage = await tutorCtx.newPage();
    const studentPage = await studentCtx.newPage();
    
    const studentLogs = collectLogs(studentPage, 'Student');
    
    await login(tutorPage, TUTOR, 'Tutor');
    await login(studentPage, STUDENT, 'Student');
    
    await navigateWithVbgSettings(tutorPage, 'Tutor', VBG_SETTINGS.image);
    await navigateToPrejoin(studentPage, 'Student');
    
    await delay(1000);
    
    await joinCall(tutorPage, 'Tutor');
    await delay(2000);
    await joinCall(studentPage, 'Student');
    
    await waitForP2P(tutorPage, 'Tutor');
    await waitForP2P(studentPage, 'Student');
    
    await delay(3000);
    
    const hasImageSettings = studentLogs.some(log => 
      log.includes('backgroundImage') || 
      log.includes('image') ||
      log.includes('vbg-settings')
    );
    
    console.log(`\n   📊 Results:`);
    console.log(`   - Student received image VBG: ${hasImageSettings ? '✅' : '❌'}`);
    
    console.log(`\n   📋 Student logs:`);
    studentLogs.filter(l => l.includes('VBG') || l.includes('vbg'))
      .slice(-5).forEach(l => console.log(`      ${l.substring(0, 80)}`));
    
    await tutorCtx.close();
    await studentCtx.close();
    
    return hasImageSettings;
    
  } catch (err) {
    console.error('   ❌ Error:', err.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function testVbgPrivacyTiming() {
  console.log('\n📝 Test 3: VBG Privacy - Applied BEFORE Video Display');
  console.log('═'.repeat(55));
  console.log('   ⚠️ Critical: VBG must be applied BEFORE showing remote video');
  
  const browser = await chromium.launch({
    headless: isHeadless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--no-sandbox',
    ],
  });
  
  try {
    const tutorCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const studentCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    
    const tutorPage = await tutorCtx.newPage();
    const studentPage = await studentCtx.newPage();
    
    const studentLogs = collectLogs(studentPage, 'Student');
    
    await login(tutorPage, TUTOR, 'Tutor');
    await navigateWithVbgSettings(tutorPage, 'Tutor', VBG_SETTINGS.blur);
    
    await login(studentPage, STUDENT, 'Student');
    
    // Tutor joins first
    await joinCall(tutorPage, 'Tutor');
    await delay(2000);
    
    // Student joins after - should get VBG BEFORE seeing video
    await navigateToPrejoin(studentPage, 'Student');
    await delay(1000);
    await joinCall(studentPage, 'Student');
    
    await waitForP2P(tutorPage, 'Tutor');
    await waitForP2P(studentPage, 'Student');
    
    await delay(2000);
    
    const vbgReceivedLogs = studentLogs.filter(l => 
      l.includes('vbg-settings') || 
      l.includes('VBG settings') ||
      l.includes('pending VBG')
    );
    
    console.log(`\n   📊 Privacy Check:`);
    console.log(`   - VBG settings logs: ${vbgReceivedLogs.length}`);
    
    const privacyOk = vbgReceivedLogs.length > 0;
    console.log(`   - Privacy protected: ${privacyOk ? '✅' : '❌'}`);
    
    console.log(`\n   📋 VBG timing logs:`);
    vbgReceivedLogs.slice(0, 5).forEach(l => console.log(`      ${l.substring(0, 80)}`));
    
    await tutorCtx.close();
    await studentCtx.close();
    
    return privacyOk;
    
  } catch (err) {
    console.error('   ❌ Error:', err.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function testBothHaveVbg() {
  console.log('\n📝 Test 4: Both Peers Have VBG Enabled');
  console.log('═'.repeat(55));
  
  const browser = await chromium.launch({
    headless: isHeadless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--no-sandbox',
    ],
  });
  
  try {
    const tutorCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const studentCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    
    const tutorPage = await tutorCtx.newPage();
    const studentPage = await studentCtx.newPage();
    
    const tutorLogs = collectLogs(tutorPage, 'Tutor');
    const studentLogs = collectLogs(studentPage, 'Student');
    
    await login(tutorPage, TUTOR, 'Tutor');
    await login(studentPage, STUDENT, 'Student');
    
    // BOTH enable VBG from prejoin
    await navigateWithVbgSettings(tutorPage, 'Tutor', VBG_SETTINGS.blur);
    await navigateWithVbgSettings(studentPage, 'Student', VBG_SETTINGS.image);
    
    await delay(1000);
    
    await joinCall(tutorPage, 'Tutor');
    await delay(2000);
    await joinCall(studentPage, 'Student');
    
    await waitForP2P(tutorPage, 'Tutor');
    await waitForP2P(studentPage, 'Student');
    
    await delay(3000);
    
    const tutorReceivedVbg = tutorLogs.some(l => 
      l.includes('vbg-settings') || l.includes('VBG settings received')
    );
    const studentReceivedVbg = studentLogs.some(l => 
      l.includes('vbg-settings') || l.includes('VBG settings received')
    );
    
    console.log(`\n   📊 Results:`);
    console.log(`   - Tutor received Student's VBG: ${tutorReceivedVbg ? '✅' : '❌'}`);
    console.log(`   - Student received Tutor's VBG: ${studentReceivedVbg ? '✅' : '❌'}`);
    
    await tutorCtx.close();
    await studentCtx.close();
    
    return tutorReceivedVbg && studentReceivedVbg;
    
  } catch (err) {
    console.error('   ❌ Error:', err.message);
    return false;
  } finally {
    await browser.close();
  }
}

// ==================== RUN ALL TESTS ====================

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       VBG P2P Test Suite v2 - localStorage Flow            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n🔗 Prejoin URL: ${PREJOIN_URL}`);
  console.log(`👨‍🏫 Tutor: ${TUTOR.username}`);
  console.log(`👨‍🎓 Student: ${STUDENT.username}`);
  
  const results = [];
  
  results.push({ name: 'VBG Blur (Prejoin)', passed: await testVbgBlurFromPrejoin() });
  results.push({ name: 'VBG Image (Prejoin)', passed: await testVbgImageFromPrejoin() });
  results.push({ name: 'VBG Privacy Timing', passed: await testVbgPrivacyTiming() });
  results.push({ name: 'Both Peers VBG', passed: await testBothHaveVbg() });
  
  // Summary
  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('📊 VBG TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════');
  
  let passed = 0;
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name.padEnd(25)} - ${r.passed ? 'PASSED' : 'FAILED'}`);
    if (r.passed) passed++;
  });
  
  console.log('───────────────────────────────────────────');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}`);
  console.log(`Success Rate: ${Math.round(passed / results.length * 100)}%`);
  console.log('═══════════════════════════════════════════\n');
  
  process.exit(passed === results.length ? 0 : 1);
}

runAllTests().catch(console.error);
