/**
 * Simple Auto Test: VBG Sync + Join Connection
 * Uses test URLs with built-in auth
 */

import puppeteer from 'puppeteer';

const ROOM_ID = 'my-test-room';
const BASE_URL = 'http://localhost:3000';

const TUTOR_URL = `${BASE_URL}/test-videolify?room=${ROOM_ID}&testUserId=1&name=Tutor&role=tutor`;
const STUDENT_URL = `${BASE_URL}/test-videolify?room=${ROOM_ID}&testUserId=2&name=Student&role=student`;

console.log('🧪 Simple VBG Sync Test');
console.log('📍 Room:', ROOM_ID);

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

async function waitForLog(page, pattern, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const logs = await getLogs(page);
    const found = logs.find(log => log.includes(pattern));
    if (found) {
      console.log(`✅ Found: "${pattern}"`);
      return found;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`⏱️ Timeout waiting for: "${pattern}"`);
}

(async () => {
  let browserTutor, browserStudent;
  
  try {
    console.log('\n🚀 Step 1: Launching browsers...');
    browserTutor = await puppeteer.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
      defaultViewport: { width: 900, height: 700 },
    });
    
    browserStudent = await puppeteer.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
      defaultViewport: { width: 900, height: 700 },
    });
    
    const tutorPage = await browserTutor.newPage();
    const studentPage = await browserStudent.newPage();
    
    await setupLogCapture(tutorPage, 'TUTOR');
    await setupLogCapture(studentPage, 'STUDENT');
    
    // ==========================================
    // TEST 1: Tutor joins first
    // ==========================================
    console.log('\n📍 TEST 1: Tutor joins room');
    await tutorPage.goto(TUTOR_URL, { waitUntil: 'networkidle2' });
    
    console.log('└─ Waiting for tutor media ready...');
    await waitForLog(tutorPage, 'Local media initialized');
    
    console.log('└─ Waiting for tutor to join room...');
    await waitForLog(tutorPage, 'Joined room successfully');
    
    console.log('└─ Tutor selects VBG...');
    await tutorPage.waitForSelector('[data-testid="toggle-virtual-bg-btn"]');
    await tutorPage.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(r => setTimeout(r, 1500));
    
    // Wait for menu to open and click first preset
    console.log('└─ Waiting for VBG menu...');
    await tutorPage.waitForSelector('[data-testid="vbg-preset-0"]', { timeout: 5000 });
    await tutorPage.evaluate(() => {
      const preset = document.querySelector('[data-testid="vbg-preset-0"]');
      if (preset) preset.click();
    });
    console.log('└─ Clicked VBG preset via evaluate()');
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('└─ Waiting for VBG to apply...');
    await waitForLog(tutorPage, 'Preset background applied');
    
    const tutorLogs1 = await getLogs(tutorPage);
    const vbgApplied = tutorLogs1.some(log => log.includes('✅ [VBG] Preset background applied'));
    console.log(`✅ TEST 1 PASSED: Tutor has VBG = ${vbgApplied}`);
    
    // ==========================================
    // TEST 2: Student joins (Fresh connection)
    // ==========================================
    console.log('\n📍 TEST 2: Student joins (Fresh Connection)');
    await studentPage.goto(STUDENT_URL, { waitUntil: 'networkidle2' });
    
    console.log('└─ Waiting for student media ready...');
    await waitForLog(studentPage, 'Local media initialized');
    
    console.log('└─ Waiting for student to join room...');
    await waitForLog(studentPage, 'Joined room successfully');
    
    console.log('└─ Waiting for peer-joined event...');
    try {
      await Promise.race([
        waitForLog(tutorPage, 'peer-joined event', 10000),
        waitForLog(studentPage, 'peer-joined event', 10000),
      ]);
    } catch (e) {
      console.warn('⚠️ No peer-joined log found (checking connection anyway)');
    }
    
    console.log('└─ Waiting for ICE connection...');
    try {
      await Promise.race([
        waitForLog(tutorPage, 'ICE Connection healthy', 15000),
        waitForLog(studentPage, 'ICE Connection healthy', 15000),
      ]);
      console.log('✅ ICE Connected!');
    } catch (e) {
      console.error('❌ ICE connection failed!');
      throw e;
    }
    
    console.log('└─ Waiting 3s for VBG sync...');
    await new Promise(r => setTimeout(r, 3000));
    
    const studentLogs1 = await getLogs(studentPage);
    const vbgReceived = studentLogs1.some(log => log.includes('📥 [VBG-DEBUG] Received VBG settings'));
    
    console.log('\n📊 TEST 2 Results:');
    console.log(`  - ICE Connected: ✅`);
    console.log(`  - Student received VBG: ${vbgReceived ? '✅' : '❌'}`);
    
    if (!vbgReceived) {
      console.log('\n🔍 Checking tutor VBG send logs...');
      const tutorLogs2 = await getLogs(tutorPage);
      const vbgSendLogs = tutorLogs2.filter(log => 
        log.includes('[VBG] ICE stable') || 
        log.includes('Skipping VBG send')
      );
      vbgSendLogs.forEach(log => console.log('  ', log));
      
      console.log('\n🔍 Checking student VBG receive logs...');
      const studentVbgLogs = studentLogs1.filter(log => log.includes('[VBG'));
      studentVbgLogs.slice(-10).forEach(log => console.log('  ', log));
    }
    
    // ==========================================
    // TEST 3: Student F5
    // ==========================================
    console.log('\n📍 TEST 3: Student F5 Refresh');
    console.log('└─ Student pressing F5...');
    await studentPage.reload({ waitUntil: 'networkidle2' });
    
    console.log('└─ Waiting for reconnection...');
    await waitForLog(studentPage, 'Joined room successfully');
    
    console.log('└─ Waiting for ICE reconnection...');
    await waitForLog(studentPage, 'ICE Connection healthy', 20000);
    
    console.log('└─ Waiting 3s for VBG sync...');
    await new Promise(r => setTimeout(r, 3000));
    
    const studentLogs2 = await getLogs(studentPage);
    const vbgReceivedAfterF5 = studentLogs2.some(log => log.includes('📥 [VBG-DEBUG] Received VBG settings'));
    
    console.log('\n📊 TEST 3 Results:');
    console.log(`  - Reconnection: ✅`);
    console.log(`  - Student received VBG after F5: ${vbgReceivedAfterF5 ? '✅' : '❌'}`);
    
    if (!vbgReceivedAfterF5) {
      console.log('\n🔍 Checking tutor VBG send after F5...');
      const tutorLogs3 = await getLogs(tutorPage);
      const recentVbgLogs = tutorLogs3.filter(log => log.includes('[VBG]')).slice(-15);
      recentVbgLogs.forEach(log => console.log('  ', log));
    }
    
    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ TEST 1: Tutor VBG setup - PASSED');
    console.log(`${vbgReceived ? '✅' : '❌'} TEST 2: Fresh join + VBG sync - ${vbgReceived ? 'PASSED' : 'FAILED'}`);
    console.log(`${vbgReceivedAfterF5 ? '✅' : '❌'} TEST 3: F5 + VBG sync - ${vbgReceivedAfterF5 ? 'PASSED' : 'FAILED'}`);
    console.log('='.repeat(60));
    
    if (!vbgReceived || !vbgReceivedAfterF5) {
      console.log('\n❌ SOME TESTS FAILED');
    } else {
      console.log('\n🎉 ALL TESTS PASSED!');
    }
    
  } catch (err) {
    console.error('\n❌ Test error:', err.message);
    console.error(err.stack);
  } finally {
    console.log('\n⏳ Keeping browsers open for 15s for manual inspection...');
    await new Promise(r => setTimeout(r, 15000));
    
    if (browserTutor) await browserTutor.close();
    if (browserStudent) await browserStudent.close();
    console.log('✅ Test complete');
  }
})();
