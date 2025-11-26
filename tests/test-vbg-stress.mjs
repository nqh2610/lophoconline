/**
 * Stress Test: Run VBG sync test multiple times
 * to check stability
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const ITERATIONS = 10;

async function setupLogCapture(page, name) {
  await page.evaluateOnNewDocument((name) => {
    window.__logs = [];
    const originalLog = console.log;
    console.log = function(...args) {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      window.__logs.push(msg);
      originalLog.apply(console, [`[${name}]`, ...args]);
    };
  }, name);
}

async function getLogs(page) {
  return await page.evaluate(() => window.__logs || []);
}

async function waitForLog(page, pattern, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const logs = await getLogs(page);
    const found = logs.find(log => log.includes(pattern));
    if (found) return found;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`⏱️ Timeout waiting for: "${pattern}"`);
}

async function runSingleTest(iteration) {
  const ROOM_ID = `test-room-${Date.now()}`;
  const TUTOR_URL = `${BASE_URL}/test-videolify?room=${ROOM_ID}&testUserId=1&name=Tutor&role=tutor`;
  const STUDENT_URL = `${BASE_URL}/test-videolify?room=${ROOM_ID}&testUserId=2&name=Student&role=student`;
  
  let browserTutor, browserStudent;
  
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST ITERATION ${iteration}/${ITERATIONS}`);
    console.log(`📍 Room: ${ROOM_ID}`);
    console.log('='.repeat(60));
    
    // Launch browsers
    [browserTutor, browserStudent] = await Promise.all([
      puppeteer.launch({ 
        headless: true,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--no-sandbox',
        ],
      }),
      puppeteer.launch({ 
        headless: true,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--no-sandbox',
        ],
      }),
    ]);
    
    const tutorPage = await browserTutor.newPage();
    const studentPage = await browserStudent.newPage();
    
    await setupLogCapture(tutorPage, 'T');
    await setupLogCapture(studentPage, 'S');
    
    // Step 1: Tutor joins
    console.log('└─ Step 1: Tutor joins...');
    await tutorPage.goto(TUTOR_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForLog(tutorPage, 'Local media initialized');
    await waitForLog(tutorPage, 'Joined room successfully');
    
    // Step 2: Tutor selects VBG
    console.log('└─ Step 2: Tutor selects VBG...');
    await tutorPage.waitForSelector('[data-testid="toggle-virtual-bg-btn"]');
    await tutorPage.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(r => setTimeout(r, 1000));
    await tutorPage.waitForSelector('[data-testid="vbg-preset-0"]');
    await tutorPage.evaluate(() => {
      document.querySelector('[data-testid="vbg-preset-0"]').click();
    });
    await waitForLog(tutorPage, 'Preset background applied');
    
    // Step 3: Student joins (TEST FRESH CONNECTION)
    console.log('└─ Step 3: Student joins (FRESH CONNECTION TEST)...');
    await studentPage.goto(STUDENT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForLog(studentPage, 'Local media initialized');
    await waitForLog(studentPage, 'Joined room successfully');
    
    // Wait for connection
    console.log('└─ Step 4: Waiting for ICE connection...');
    const iceStartTime = Date.now();
    await waitForLog(studentPage, 'ICE Connection healthy', 20000);
    const iceTime = Date.now() - iceStartTime;
    console.log(`   ✅ ICE connected in ${iceTime}ms`);
    
    // Wait for VBG sync
    console.log('└─ Step 5: Waiting for VBG sync...');
    await new Promise(r => setTimeout(r, 3000));
    
    const studentLogs = await getLogs(studentPage);
    const vbgReceived = studentLogs.some(log => log.includes('📥 [VBG-DEBUG] Received VBG settings'));
    
    if (!vbgReceived) {
      console.error('   ❌ FAILED: Student did not receive VBG!');
      
      // Debug logs
      const tutorLogs = await getLogs(tutorPage);
      const vbgSent = tutorLogs.filter(log => log.includes('[VBG] ICE stable'));
      console.log('   Tutor VBG send logs:', vbgSent);
      
      const studentVbgLogs = studentLogs.filter(log => log.includes('[VBG'));
      console.log('   Student VBG logs:', studentVbgLogs.slice(-5));
      
      return { success: false, reason: 'VBG not received on fresh join', iceTime };
    }
    
    console.log('   ✅ VBG received!');
    
    // Step 6: Student F5 (TEST RECONNECTION)
    console.log('└─ Step 6: Student F5 (RECONNECTION TEST)...');
    await studentPage.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await waitForLog(studentPage, 'Joined room successfully');
    
    console.log('└─ Step 7: Waiting for ICE reconnection...');
    const reconnectStartTime = Date.now();
    
    try {
      await waitForLog(studentPage, 'ICE Connection healthy', 15000);
      const reconnectTime = Date.now() - reconnectStartTime;
      console.log(`   ✅ ICE reconnected in ${reconnectTime}ms`);
    } catch (err) {
      console.error(`   ❌ ICE reconnection timeout after 15s`);
      return { success: false, reason: 'ICE reconnection timeout after F5' };
    }
    
    const reconnectTime = Date.now() - reconnectStartTime;
    
    await new Promise(r => setTimeout(r, 3000));
    
    const studentLogs2 = await getLogs(studentPage);
    const vbgReceivedAfterF5 = studentLogs2.some(log => log.includes('📥 [VBG-DEBUG] Received VBG settings'));
    
    if (!vbgReceivedAfterF5) {
      console.error('   ❌ FAILED: Student did not receive VBG after F5!');
      return { success: false, reason: 'VBG not received after F5', iceTime, reconnectTime };
    }
    
    console.log('   ✅ VBG received after F5!');
    console.log(`\n✅ ITERATION ${iteration} PASSED (ICE: ${iceTime}ms, Reconnect: ${reconnectTime}ms)`);
    
    return { success: true, iceTime, reconnectTime };
    
  } catch (err) {
    console.error(`\n❌ ITERATION ${iteration} FAILED:`, err.message);
    return { success: false, reason: err.message, error: err };
  } finally {
    if (browserTutor) await browserTutor.close();
    if (browserStudent) await browserStudent.close();
  }
}

(async () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🔥 STRESS TEST: VBG SYNC STABILITY');
  console.log(`Running ${ITERATIONS} iterations...`);
  console.log('='.repeat(60));
  
  const results = [];
  
  for (let i = 1; i <= ITERATIONS; i++) {
    const result = await runSingleTest(i);
    results.push(result);
    
    if (!result.success) {
      console.log(`\n⚠️ Failure on iteration ${i}, continuing...`);
    }
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const passRate = (passed / ITERATIONS * 100).toFixed(1);
  
  console.log(`✅ Passed: ${passed}/${ITERATIONS} (${passRate}%)`);
  console.log(`❌ Failed: ${failed}/${ITERATIONS}`);
  
  if (passed > 0) {
    const iceTimes = results.filter(r => r.success).map(r => r.iceTime);
    const reconnectTimes = results.filter(r => r.success).map(r => r.reconnectTime);
    
    const avgIce = (iceTimes.reduce((a, b) => a + b, 0) / iceTimes.length).toFixed(0);
    const avgReconnect = (reconnectTimes.reduce((a, b) => a + b, 0) / reconnectTimes.length).toFixed(0);
    
    console.log(`\n⏱️ Average ICE time: ${avgIce}ms`);
    console.log(`⏱️ Average Reconnect time: ${avgReconnect}ms`);
  }
  
  if (failed > 0) {
    console.log('\n❌ Failed iterations:');
    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`  - Iteration ${i + 1}: ${r.reason}`);
      }
    });
  }
  
  console.log('='.repeat(60));
  
  if (passRate < 100) {
    console.log(`\n⚠️ UNSTABLE! Only ${passRate}% success rate`);
    process.exit(1);
  } else {
    console.log('\n🎉 100% SUCCESS! Code is stable!');
  }
})();
