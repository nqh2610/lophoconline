/**
 * P2P Reconnection Test Suite
 * 
 * Tests various scenarios that can cause P2P disconnection:
 * 1. Fresh Join - Both peers join
 * 2. Single F5 Refresh - One peer refreshes
 * 3. Both F5 Refresh - Both peers refresh simultaneously
 * 4. Tutor leaves and rejoins
 * 5. Student leaves and rejoins
 * 6. Rapid refresh cycles
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = '6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';
const PREJOIN_URL = `${BASE_URL}/prejoin-videolify-v2?accessToken=${ACCESS_TOKEN}`;

const TUTOR = { username: 'tutor_mai', password: '123456' };
const STUDENT = { username: 'test', password: 'Test123456' };

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const results = [];

/**
 * Login helper
 */
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

/**
 * Join video call from prejoin
 */
async function joinCall(page, label) {
  await page.goto(PREJOIN_URL);
  await page.waitForLoadState('networkidle');
  
  // Wait for join button to be enabled
  await page.waitForFunction(() => {
    const btn = document.querySelector('#join-button');
    return btn && !btn.disabled;
  }, { timeout: 30000 });
  
  await page.locator('#join-button').click();
  console.log(`   [${label}] Clicked join`);
  
  await page.waitForURL(url => url.pathname.includes('/video-call-v2/'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  console.log(`   [${label}] In video call`);
}

/**
 * Wait for P2P connection with detailed status
 */
async function waitForP2P(page, label, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      let remoteActive = false;
      let localActive = false;
      
      for (const v of videos) {
        const hasFrames = v.videoWidth > 0 && v.videoHeight > 0;
        const hasData = v.readyState >= 2;
        
        if (hasFrames || hasData) {
          if (v.muted) localActive = true;
          else remoteActive = true;
        }
      }
      
      return { localActive, remoteActive, videoCount: videos.length };
    });
    
    if (state.remoteActive || (state.videoCount >= 2 && state.localActive)) {
      const elapsed = Date.now() - startTime;
      console.log(`   [${label}] ✅ P2P connected (${elapsed}ms)`);
      return { success: true, elapsed };
    }
    
    await delay(300);
  }
  
  console.log(`   [${label}] ❌ P2P timeout after ${timeout}ms`);
  return { success: false, elapsed: timeout };
}

/**
 * Check if connection is still active
 */
async function isConnected(page) {
  return await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll('video'));
    for (const v of videos) {
      if (!v.muted && v.videoWidth > 0) return true;
    }
    return false;
  });
}

/**
 * Run test and record result
 */
function recordResult(name, passed, details = '') {
  results.push({ name, passed, details });
  console.log(`\n${passed ? '✅' : '❌'} TEST: ${name} - ${passed ? 'PASSED' : 'FAILED'}${details ? ` (${details})` : ''}`);
}

// ==================== TEST CASES ====================

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('   🧪 P2P RECONNECTION TEST SUITE');
  console.log('═'.repeat(60));
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Tutor: ${TUTOR.username}`);
  console.log(`   Student: ${STUDENT.username}`);
  console.log('═'.repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: process.env.HEADLESS === '1',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--no-sandbox',
    ],
  });

  let tutorCtx, studentCtx, tutorPage, studentPage;

  try {
    // Create contexts
    tutorCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    studentCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    tutorPage = await tutorCtx.newPage();
    studentPage = await studentCtx.newPage();

    // Collect console logs
    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('Connection state') || text.includes('peer-joined') || text.includes('ICE')) {
        console.log(`   [Tutor Console] ${text.substring(0, 100)}`);
      }
    });
    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('Connection state') || text.includes('peer-joined') || text.includes('ICE')) {
        console.log(`   [Student Console] ${text.substring(0, 100)}`);
      }
    });

    // ========== TEST 1: Fresh Join ==========
    console.log('\n📋 TEST 1: Fresh Join');
    console.log('─'.repeat(40));
    
    await login(tutorPage, TUTOR, 'Tutor');
    await login(studentPage, STUDENT, 'Student');
    
    await joinCall(tutorPage, 'Tutor');
    await delay(1000);
    await joinCall(studentPage, 'Student');
    
    const freshJoin1 = await waitForP2P(tutorPage, 'Tutor');
    const freshJoin2 = await waitForP2P(studentPage, 'Student');
    
    recordResult('Fresh Join', freshJoin1.success && freshJoin2.success, 
      `Tutor: ${freshJoin1.elapsed}ms, Student: ${freshJoin2.elapsed}ms`);

    if (!freshJoin1.success || !freshJoin2.success) {
      throw new Error('Fresh join failed - cannot continue tests');
    }

    await delay(2000);

    // ========== TEST 2: Tutor F5 Refresh ==========
    console.log('\n📋 TEST 2: Tutor F5 Refresh');
    console.log('─'.repeat(40));
    
    console.log('   [Tutor] Pressing F5...');
    await tutorPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Tutor should auto-rejoin since still on video-call page
    await delay(3000);
    
    const tutorF5_1 = await waitForP2P(tutorPage, 'Tutor', 20000);
    const tutorF5_2 = await waitForP2P(studentPage, 'Student', 20000);
    
    recordResult('Tutor F5 Refresh', tutorF5_1.success && tutorF5_2.success,
      `Reconnect time: ${Math.max(tutorF5_1.elapsed, tutorF5_2.elapsed)}ms`);

    await delay(2000);

    // ========== TEST 3: Student F5 Refresh ==========
    console.log('\n📋 TEST 3: Student F5 Refresh');
    console.log('─'.repeat(40));
    
    console.log('   [Student] Pressing F5...');
    await studentPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    
    await delay(3000);
    
    const studentF5_1 = await waitForP2P(tutorPage, 'Tutor', 20000);
    const studentF5_2 = await waitForP2P(studentPage, 'Student', 20000);
    
    recordResult('Student F5 Refresh', studentF5_1.success && studentF5_2.success,
      `Reconnect time: ${Math.max(studentF5_1.elapsed, studentF5_2.elapsed)}ms`);

    await delay(2000);

    // ========== TEST 4: Both F5 Simultaneously ==========
    console.log('\n📋 TEST 4: Both F5 Simultaneously');
    console.log('─'.repeat(40));
    
    console.log('   [Both] Pressing F5 simultaneously...');
    await Promise.all([
      tutorPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 }),
      studentPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 })
    ]);
    
    await delay(4000);
    
    const bothF5_1 = await waitForP2P(tutorPage, 'Tutor', 25000);
    const bothF5_2 = await waitForP2P(studentPage, 'Student', 25000);
    
    recordResult('Both F5 Simultaneously', bothF5_1.success && bothF5_2.success,
      `Reconnect time: ${Math.max(bothF5_1.elapsed, bothF5_2.elapsed)}ms`);

    await delay(2000);

    // ========== TEST 5: Tutor Leaves and Rejoins ==========
    console.log('\n📋 TEST 5: Tutor Leaves and Rejoins');
    console.log('─'.repeat(40));
    
    console.log('   [Tutor] Navigating away...');
    await tutorPage.goto(`${BASE_URL}/dashboard`);
    await delay(3000);
    
    console.log('   [Tutor] Rejoining...');
    await joinCall(tutorPage, 'Tutor');
    
    await delay(2000);
    
    const tutorRejoin1 = await waitForP2P(tutorPage, 'Tutor', 25000);
    const tutorRejoin2 = await waitForP2P(studentPage, 'Student', 25000);
    
    recordResult('Tutor Leaves and Rejoins', tutorRejoin1.success && tutorRejoin2.success,
      `Reconnect time: ${Math.max(tutorRejoin1.elapsed, tutorRejoin2.elapsed)}ms`);

    await delay(2000);

    // ========== TEST 6: Student Leaves and Rejoins ==========
    console.log('\n📋 TEST 6: Student Leaves and Rejoins');
    console.log('─'.repeat(40));
    
    console.log('   [Student] Navigating away...');
    await studentPage.goto(`${BASE_URL}/dashboard`);
    await delay(3000);
    
    console.log('   [Student] Rejoining...');
    await joinCall(studentPage, 'Student');
    
    await delay(2000);
    
    const studentRejoin1 = await waitForP2P(tutorPage, 'Tutor', 25000);
    const studentRejoin2 = await waitForP2P(studentPage, 'Student', 25000);
    
    recordResult('Student Leaves and Rejoins', studentRejoin1.success && studentRejoin2.success,
      `Reconnect time: ${Math.max(studentRejoin1.elapsed, studentRejoin2.elapsed)}ms`);

    await delay(2000);

    // ========== TEST 7: Rapid F5 Cycles (3x) ==========
    console.log('\n📋 TEST 7: Rapid F5 Cycles (Tutor 3x)');
    console.log('─'.repeat(40));
    
    let rapidSuccess = true;
    for (let i = 1; i <= 3; i++) {
      console.log(`   [Tutor] F5 cycle ${i}/3...`);
      await tutorPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      await delay(3000);
      
      const rapid1 = await waitForP2P(tutorPage, 'Tutor', 15000);
      const rapid2 = await waitForP2P(studentPage, 'Student', 15000);
      
      if (!rapid1.success || !rapid2.success) {
        rapidSuccess = false;
        console.log(`   ❌ Failed at cycle ${i}`);
        break;
      }
      console.log(`   ✅ Cycle ${i} OK`);
      await delay(1000);
    }
    
    recordResult('Rapid F5 Cycles (3x)', rapidSuccess);

    // ========== TEST 8: Connection Stability (30s) ==========
    console.log('\n📋 TEST 8: Connection Stability (30s)');
    console.log('─'.repeat(40));
    
    // Wait for connection to stabilize after rapid F5 tests
    console.log('   Waiting for connection to stabilize...');
    await waitForP2P(tutorPage, 'Tutor', 15000);
    await waitForP2P(studentPage, 'Student', 15000);
    await delay(2000); // Extra buffer time
    console.log('   Connection stable, starting monitoring...');
    
    let stableCount = 0;
    const checkInterval = 5000;
    const duration = 30000;
    
    for (let elapsed = 0; elapsed < duration; elapsed += checkInterval) {
      const tutorConnected = await isConnected(tutorPage);
      const studentConnected = await isConnected(studentPage);
      
      if (tutorConnected && studentConnected) {
        stableCount++;
        console.log(`   [${elapsed/1000}s] ✅ Both connected`);
      } else {
        console.log(`   [${elapsed/1000}s] ⚠️ Tutor: ${tutorConnected}, Student: ${studentConnected}`);
      }
      
      await delay(checkInterval);
    }
    
    const expectedChecks = duration / checkInterval;
    const stabilityPercent = (stableCount / expectedChecks * 100).toFixed(0);
    recordResult('Connection Stability (30s)', stableCount === expectedChecks,
      `${stabilityPercent}% stable (${stableCount}/${expectedChecks} checks)`);

  } catch (err) {
    console.error('\n❌ Test error:', err.message);
  } finally {
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('   📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(60));
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(r => {
      console.log(`   ${r.passed ? '✅' : '❌'} ${r.name}${r.details ? ` - ${r.details}` : ''}`);
    });
    
    console.log('─'.repeat(60));
    console.log(`   Total: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
    console.log(`   Success Rate: ${(passed/total*100).toFixed(0)}%`);
    console.log('═'.repeat(60) + '\n');

    await tutorCtx?.close();
    await studentCtx?.close();
    await browser.close();
    
    process.exit(passed === total ? 0 : 1);
  }
}

runTests();
