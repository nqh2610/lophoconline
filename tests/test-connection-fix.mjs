/**
 * Test Connection Fix - Verify deduplication works
 * Quick automated test to check if duplicate peer-joined events are prevented
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3001';
const ROOM_ID = `test-fix-${Date.now()}`;

console.log('🧪 Testing Connection Fix...');
console.log(`📍 Room: ${ROOM_ID}\n`);

async function launchBrowser(name, role, userId) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--auto-accept-camera-and-microphone-capture',
      `--window-size=800,600`,
      `--window-position=${role === 'tutor' ? 0 : 820},0`
    ]
  });

  const page = await browser.newPage();
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE_URL, ['camera', 'microphone']);

  const logs = [];

  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);

    // Show important logs
    if (
      text.includes('[useSignaling]') ||
      text.includes('[VideolifyFull_v2]') ||
      text.includes('Connection state:') ||
      text.includes('Peer joined:')
    ) {
      console.log(`[${name}] ${text}`);
    }
  });

  // Capture errors
  page.on('pageerror', err => {
    console.error(`[${name}] ❌ Error:`, err.message);
    logs.push(`ERROR: ${err.message}`);
  });

  const url = `${BASE_URL}/test-videolify-v2?room=${ROOM_ID}&testUserId=${userId}&name=${name}&role=${role}`;
  console.log(`[${name}] 🌐 Opening: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(2000);

  return { browser, page, logs };
}

async function checkConnection(page, name) {
  try {
    const result = await page.evaluate(() => {
      const indicator = document.querySelector('.absolute.top-3.left-3 > div');
      const isGreen = indicator?.classList.contains('bg-green-500');
      const isOrange = indicator?.classList.contains('bg-orange-500');

      const localVideo = document.querySelector('video[muted]');
      const remoteVideo = document.querySelector('video:not([muted])');

      return {
        connected: isGreen,
        connecting: isOrange,
        localVideoReady: localVideo?.readyState === 4,
        remoteVideoReady: remoteVideo?.readyState === 4,
        localSrc: !!localVideo?.srcObject,
        remoteSrc: !!remoteVideo?.srcObject,
      };
    });

    return result;
  } catch (err) {
    console.error(`[${name}] ❌ Check failed:`, err.message);
    return null;
  }
}

function analyzeLogs(logs, peerName) {
  // Check for duplicate peer-joined events
  const peerJoinedEvents = logs.filter(log => log.includes('[useSignaling] Peer joined:'));
  const ignoredDuplicates = logs.filter(log => log.includes('Ignoring duplicate peer-joined'));

  console.log(`\n📊 [${peerName}] Log Analysis:`);
  console.log(`   Total peer-joined events: ${peerJoinedEvents.length}`);
  console.log(`   Duplicate events ignored: ${ignoredDuplicates.length}`);

  // Extract peer IDs
  const peerIds = peerJoinedEvents.map(log => {
    const match = log.match(/Peer joined: (peer-[^\s]+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  // Check for duplicates in the array
  const uniquePeerIds = new Set(peerIds);
  const hasDuplicates = peerIds.length !== uniquePeerIds.size;

  if (hasDuplicates) {
    console.log(`   ❌ DUPLICATE DETECTED! Same peer ID appeared multiple times`);
    console.log(`   Peer IDs: ${peerIds.join(', ')}`);
    return false;
  } else {
    console.log(`   ✅ No duplicates - each peer ID appears once`);
    return true;
  }
}

async function runTest() {
  let tutor = null;
  let student = null;

  try {
    // Launch tutor
    console.log('👨‍🏫 Launching Tutor...\n');
    tutor = await launchBrowser('Tutor', 'tutor', 1);
    await tutor.page.waitForTimeout(3000);

    // Launch student
    console.log('\n👨‍🎓 Launching Student...\n');
    student = await launchBrowser('Student', 'student', 2);

    // Wait for negotiation
    console.log('\n⏳ Waiting for WebRTC negotiation (10s)...\n');
    await student.page.waitForTimeout(10000);

    // Check final connection status
    console.log('🔍 Checking connection status...\n');

    const tutorStatus = await checkConnection(tutor.page, 'Tutor');
    const studentStatus = await checkConnection(student.page, 'Student');

    console.log('📊 Connection Status:');
    console.log('Tutor:', tutorStatus);
    console.log('Student:', studentStatus);

    // Analyze logs for duplicates
    const tutorNoDuplicates = analyzeLogs(tutor.logs, 'Tutor');
    const studentNoDuplicates = analyzeLogs(student.logs, 'Student');

    // Evaluate results
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST RESULTS');
    console.log('='.repeat(60));

    const tutorConnected = tutorStatus?.connected === true;
    const studentConnected = studentStatus?.connected === true;
    const bothHaveRemote = tutorStatus?.remoteSrc && studentStatus?.remoteSrc;
    const noDuplicates = tutorNoDuplicates && studentNoDuplicates;

    console.log(`Tutor Connected: ${tutorConnected ? '✅' : '❌'}`);
    console.log(`Student Connected: ${studentConnected ? '✅' : '❌'}`);
    console.log(`Both Have Remote Video: ${bothHaveRemote ? '✅' : '❌'}`);
    console.log(`No Duplicate Events: ${noDuplicates ? '✅' : '❌'}`);

    const allPassed = tutorConnected && studentConnected && bothHaveRemote && noDuplicates;

    console.log('='.repeat(60));

    if (allPassed) {
      console.log('\n✅ TEST PASSED - Connection fix working!');
      console.log('   - 100% connection established');
      console.log('   - No duplicate peer-joined events');
      console.log('   - Both peers have video');
      return true;
    } else {
      console.log('\n❌ TEST FAILED - Issues detected:');
      if (!tutorConnected || !studentConnected) {
        console.log('   - Connection not established');
      }
      if (!bothHaveRemote) {
        console.log('   - Remote video missing');
      }
      if (!noDuplicates) {
        console.log('   - Duplicate events still occurring');
      }
      return false;
    }

  } catch (err) {
    console.error('\n❌ Test Error:', err);
    return false;
  } finally {
    console.log('\n⏳ Keeping browsers open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🧹 Cleaning up...\n');
    if (tutor) await tutor.browser.close();
    if (student) await student.browser.close();
  }
}

// Run the test
runTest()
  .then(passed => {
    console.log(passed ? '\n✅ All tests passed!' : '\n❌ Tests failed!');
    process.exit(passed ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
