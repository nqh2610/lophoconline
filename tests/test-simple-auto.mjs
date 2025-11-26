#!/usr/bin/env node
/**
 * SIMPLE AUTO TEST - No testLogs dependency
 * Just check connection via DOM and timing
 */

import puppeteer from 'puppeteer';

const ROOM = `test-${Date.now()}`;
const BASE_URL = 'http://localhost:3000/test-videolify';
const TUTOR_URL = `${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor`;
const STUDENT_URL = `${BASE_URL}?room=${ROOM}&name=Student&role=student`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const checkConnected = async (page) => {
  try {
    const connected = await page.evaluate(() => {
      // Check data-testid="connection-indicator" data-connected="true"
      const indicator = document.querySelector('[data-testid="connection-indicator"]');
      return indicator && indicator.getAttribute('data-connected') === 'true';
    });
    return connected;
  } catch (e) {
    return false;
  }
};

const waitForConnection = async (page, timeout = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await checkConnected(page)) {
      return Date.now() - start;
    }
    await sleep(500);
  }
  throw new Error('Connection timeout');
};

(async () => {
  let browserTutor, browserStudent;
  const results = { passed: 0, failed: 0, tests: [] };

  try {
    console.log('\n🧪 SIMPLE AUTO TEST');
    console.log('===================\n');
    console.log(`Room: ${ROOM}\n`);

    // Launch browsers
    browserTutor = await puppeteer.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });
    
    browserStudent = await puppeteer.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });

    const tutorPage = await browserTutor.newPage();
    const studentPage = await browserStudent.newPage();

    // Enable console logging
    tutorPage.on('console', msg => {
      if (msg.text().includes('ERROR') || msg.text().includes('FATAL')) {
        console.log('🔴 Tutor:', msg.text());
      }
    });
    
    studentPage.on('console', msg => {
      if (msg.text().includes('ERROR') || msg.text().includes('FATAL')) {
        console.log('🔴 Student:', msg.text());
      }
    });

    // ============================================
    // TEST 1: FRESH JOIN
    // ============================================
    console.log('📝 TEST 1: Fresh Join');
    console.log('----------------------');
    
    const t1Start = Date.now();
    
    await tutorPage.goto(TUTOR_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('  ✓ Tutor loaded');
    
    await sleep(2000);
    
    await studentPage.goto(STUDENT_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('  ✓ Student loaded');

    try {
      const joinTime = await waitForConnection(studentPage, 15000);
      console.log(`  ✅ Connected in ${joinTime}ms`);
      results.passed++;
      results.tests.push({ name: 'Fresh Join', status: 'PASS', time: joinTime });
    } catch (e) {
      console.log(`  ❌ FAILED: ${e.message}`);
      results.failed++;
      results.tests.push({ name: 'Fresh Join', status: 'FAIL', error: e.message });
    }

    await sleep(3000);

    // ============================================
    // TEST 2: STUDENT F5
    // ============================================
    console.log('\n📝 TEST 2: Student F5 Refresh');
    console.log('-----------------------------');
    
    const t2Start = Date.now();
    
    try {
      await studentPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('  ✓ Student reloaded');
      await sleep(2000); // Wait for JS to initialize

      const reconnectTime = await waitForConnection(studentPage, 15000);
      console.log(`  ✅ Reconnected in ${reconnectTime}ms`);
      
      if (reconnectTime < 8000) {
        results.passed++;
        results.tests.push({ name: 'Student F5', status: 'PASS', time: reconnectTime });
      } else {
        console.log(`  ⚠️  Slow reconnect (> 8s)`);
        results.failed++;
        results.tests.push({ name: 'Student F5', status: 'SLOW', time: reconnectTime });
      }
    } catch (e) {
      console.log(`  ❌ FAILED: ${e.message}`);
      results.failed++;
      results.tests.push({ name: 'Student F5', status: 'FAIL', error: e.message });
    }

    await sleep(3000);

    // ============================================
    // TEST 3: TUTOR F5
    // ============================================
    console.log('\n📝 TEST 3: Tutor F5 Refresh');
    console.log('---------------------------');
    
    const t3Start = Date.now();
    
    try {
      await tutorPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('  ✓ Tutor reloaded');
      await sleep(2000);

      const reconnectTime = await waitForConnection(tutorPage, 15000);
      console.log(`  ✅ Reconnected in ${reconnectTime}ms`);
      
      if (reconnectTime < 8000) {
        results.passed++;
        results.tests.push({ name: 'Tutor F5', status: 'PASS', time: reconnectTime });
      } else {
        console.log(`  ⚠️  Slow reconnect (> 8s)`);
        results.failed++;
        results.tests.push({ name: 'Tutor F5', status: 'SLOW', time: reconnectTime });
      }
    } catch (e) {
      console.log(`  ❌ FAILED: ${e.message}`);
      results.failed++;
      results.tests.push({ name: 'Tutor F5', status: 'FAIL', error: e.message });
    }

    await sleep(3000);

    // ============================================
    // TEST 4: BOTH F5 (Stress test)
    // ============================================
    console.log('\n📝 TEST 4: Both F5 Simultaneously');
    console.log('----------------------------------');
    
    try {
      await Promise.all([
        tutorPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 }),
        studentPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 })
      ]);
      console.log('  ✓ Both reloaded');
      await sleep(3000);

      const reconnectTime = await waitForConnection(tutorPage, 15000);
      console.log(`  ✅ Reconnected in ${reconnectTime}ms`);
      results.passed++;
      results.tests.push({ name: 'Both F5', status: 'PASS', time: reconnectTime });
    } catch (e) {
      console.log(`  ❌ FAILED: ${e.message}`);
      results.failed++;
      results.tests.push({ name: 'Both F5', status: 'FAIL', error: e.message });
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n\n📊 TEST RESULTS');
    console.log('=====================================');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Pass Rate: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
    
    console.log('\n📋 Details:');
    results.tests.forEach(test => {
      const icon = test.status === 'PASS' ? '✅' : test.status === 'SLOW' ? '⚠️' : '❌';
      const time = test.time ? ` (${test.time}ms)` : '';
      const error = test.error ? ` - ${test.error}` : '';
      console.log(`  ${icon} ${test.name}: ${test.status}${time}${error}`);
    });

    console.log('\n💡 Browsers left open for manual inspection');
    console.log('   Press Ctrl+C to exit\n');

    // Keep process alive
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
