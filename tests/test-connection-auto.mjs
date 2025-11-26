/**
 * AUTO TEST: Video Call Connection
 * Test initial join và F5 reconnection
 */

import puppeteer from 'puppeteer';

const ROOM_ID = 'auto-test-' + Date.now();
const SERVER_URL = 'http://localhost:3000'; // Will try 3000, 3001, 3002

async function findWorkingPort() {
  for (const port of [3000, 3001, 3002]) {
    try {
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok) {
        console.log(`✅ Server found at port ${port}`);
        return port;
      }
    } catch (e) {
      // Port not available
    }
  }
  throw new Error('❌ No server found on ports 3000, 3001, or 3002');
}

async function setupBrowser(name, role, port) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream', // Auto-allow camera/mic
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
    ],
  });

  const page = await browser.newPage();

  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('[Videolify]') || text.includes('SSE') || text.includes('Joining')) {
      console.log(`[${name}] ${text}`);
    }
  });

  const url = `http://localhost:${port}/test-videolify?room=${ROOM_ID}&name=${name}&role=${role}`;
  console.log(`\n🌐 [${name}] Opening: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2' });

  return { browser, page, logs };
}

async function waitForLog(logs, searchText, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const found = logs.find(log => log.includes(searchText));
    if (found) return found;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout waiting for log: ${searchText}`);
}

async function test() {
  console.log('🚀 Starting Auto Test...\n');

  // Find server port
  const port = await findWorkingPort();

  let tutor, student;

  try {
    // === TEST 1: Initial Join ===
    console.log('\n📋 TEST 1: Initial Join Connection');
    console.log('='.repeat(60));

    // Open Tutor browser
    console.log('\n👨‍🏫 Opening Tutor browser...');
    tutor = await setupBrowser('Tutor', 'tutor', port);

    // Wait for Tutor to join
    await waitForLog(tutor.logs, '✅ Joined room successfully');
    console.log('✅ Tutor joined room');

    // Wait a bit for SSE to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Open Student browser
    console.log('\n👨‍🎓 Opening Student browser...');
    student = await setupBrowser('Student', 'student', port);

    // Wait for Student to join
    await waitForLog(student.logs, '✅ Joined room successfully');
    console.log('✅ Student joined room');

    // Check if Tutor received peer-joined event
    console.log('\n🔍 Checking if Tutor received peer-joined event...');
    try {
      await waitForLog(tutor.logs, 'Peer joined event', 5000);
      console.log('✅ Tutor received peer-joined event!');
    } catch (e) {
      console.error('❌ Tutor did NOT receive peer-joined event!');
      console.log('\n📊 Tutor logs related to connection:');
      tutor.logs.filter(log =>
        log.includes('SSE') ||
        log.includes('Joined') ||
        log.includes('peer')
      ).forEach(log => console.log(`  ${log}`));

      console.log('\n📊 Student logs related to connection:');
      student.logs.filter(log =>
        log.includes('SSE') ||
        log.includes('Joined') ||
        log.includes('peer')
      ).forEach(log => console.log(`  ${log}`));

      throw new Error('Peer-joined event not received');
    }

    // Check if offer was created
    console.log('\n🔍 Checking if Tutor created offer...');
    try {
      await waitForLog(tutor.logs, 'Creating offer', 5000);
      console.log('✅ Tutor created offer!');
    } catch (e) {
      console.error('❌ Tutor did NOT create offer!');
      throw new Error('Offer not created');
    }

    // Check if Student received offer
    console.log('\n🔍 Checking if Student received offer...');
    try {
      await waitForLog(student.logs, 'Received offer', 5000);
      console.log('✅ Student received offer!');
    } catch (e) {
      console.error('❌ Student did NOT receive offer!');
      throw new Error('Offer not received');
    }

    // Check if Student created answer
    console.log('\n🔍 Checking if Student created answer...');
    try {
      await waitForLog(student.logs, 'Creating answer', 5000);
      console.log('✅ Student created answer!');
    } catch (e) {
      console.error('❌ Student did NOT create answer!');
      throw new Error('Answer not created');
    }

    // Check if connection established
    console.log('\n🔍 Checking if P2P connection established...');
    try {
      await waitForLog(tutor.logs, 'P2P Connection Established', 10000);
      console.log('✅ Tutor: P2P Connection Established!');

      await waitForLog(student.logs, 'P2P Connection Established', 10000);
      console.log('✅ Student: P2P Connection Established!');
    } catch (e) {
      console.error('❌ P2P Connection NOT established!');
      throw new Error('Connection not established');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST 1 PASSED: Initial Join Connection Works!');
    console.log('='.repeat(60));

    // === TEST 2: F5 Reconnection ===
    console.log('\n📋 TEST 2: F5 Reconnection');
    console.log('='.repeat(60));

    console.log('\n🔄 Refreshing Student browser (F5)...');
    const studentLogsBefore = student.logs.length;
    await student.page.reload({ waitUntil: 'networkidle2' });

    // Wait for Student to rejoin
    console.log('\n🔍 Waiting for Student to rejoin...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check logs after refresh
    const newLogs = student.logs.slice(studentLogsBefore);
    const joinedAgain = newLogs.find(log => log.includes('✅ Joined room successfully'));

    if (joinedAgain) {
      console.log('✅ Student rejoined after F5!');
    } else {
      console.error('❌ Student did NOT rejoin after F5!');
      throw new Error('F5 rejoin failed');
    }

    // Check if reconnection established
    console.log('\n🔍 Checking if reconnection established...');
    try {
      const reconnectedLog = newLogs.find(log => log.includes('P2P Connection Established'));
      if (reconnectedLog) {
        console.log('✅ Student: Reconnection Established after F5!');
      } else {
        throw new Error('Not found');
      }
    } catch (e) {
      console.error('❌ Reconnection NOT established after F5!');
      console.log('\n📊 Student logs after F5:');
      newLogs.forEach(log => console.log(`  ${log}`));
      throw new Error('F5 reconnection failed');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST 2 PASSED: F5 Reconnection Works!');
    console.log('='.repeat(60));

    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n📊 Error Details:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (tutor) {
      await tutor.browser.close();
      console.log('✅ Tutor browser closed');
    }
    if (student) {
      await student.browser.close();
      console.log('✅ Student browser closed');
    }
  }
}

// Run test
test().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
