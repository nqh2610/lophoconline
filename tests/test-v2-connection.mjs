/**
 * Test V2 Connection Stability
 * Auto test kết nối P2P giữa 2 peers
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3001';
const ROOM_ID = `test-${Date.now()}`;
const TEST_DURATION = 30000; // 30s

console.log('🧪 Starting V2 Connection Test...');
console.log(`📍 Room: ${ROOM_ID}`);

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

  // Grant permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE_URL, ['camera', 'microphone']);

  // Listen for console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[WebRTC]') || text.includes('[Signal]') || text.includes('ICE')) {
      console.log(`[${name}] ${text}`);
    }
  });

  // Listen for errors
  page.on('pageerror', err => {
    console.error(`[${name}] ❌ Page Error:`, err.message);
  });

  const url = `${BASE_URL}/test-videolify-v2?room=${ROOM_ID}&testUserId=${userId}&name=${name}&role=${role}`;
  console.log(`[${name}] 🌐 Opening: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(2000);

  return { browser, page };
}

async function checkConnectionStatus(page, name) {
  try {
    const stats = await page.evaluate(() => {
      // Find connection indicator
      const indicator = document.querySelector('.absolute.top-3.left-3 > div');
      const isGreen = indicator?.classList.contains('bg-green-500');

      // Check video elements
      const localVideo = document.querySelector('video[muted]');
      const remoteVideo = document.querySelector('video:not([muted])');

      return {
        connected: isGreen,
        localVideoReady: localVideo?.readyState === 4,
        remoteVideoReady: remoteVideo?.readyState === 4,
        localVideoSrc: !!localVideo?.srcObject,
        remoteVideoSrc: !!remoteVideo?.srcObject,
      };
    });

    return stats;
  } catch (err) {
    console.error(`[${name}] ❌ Error checking status:`, err.message);
    return null;
  }
}

async function runTest() {
  let tutor = null;
  let student = null;

  try {
    // Launch tutor browser
    console.log('\n👨‍🏫 Launching Tutor...');
    tutor = await launchBrowser('Tutor', 'tutor', 1);
    await tutor.page.waitForTimeout(3000);

    // Launch student browser
    console.log('\n👨‍🎓 Launching Student...');
    student = await launchBrowser('Student', 'student', 2);
    await student.page.waitForTimeout(3000);

    console.log('\n⏳ Waiting for WebRTC negotiation...');
    await tutor.page.waitForTimeout(5000);

    // Check connection every 2s for TEST_DURATION
    const startTime = Date.now();
    let successCount = 0;
    let totalChecks = 0;
    let lastTutorStats = null;
    let lastStudentStats = null;

    console.log('\n📊 Monitoring connection stability...\n');

    while (Date.now() - startTime < TEST_DURATION) {
      totalChecks++;

      const tutorStats = await checkConnectionStatus(tutor.page, 'Tutor');
      const studentStats = await checkConnectionStatus(student.page, 'Student');

      lastTutorStats = tutorStats;
      lastStudentStats = studentStats;

      const bothConnected = tutorStats?.connected && studentStats?.connected;
      const bothHaveRemoteVideo = tutorStats?.remoteVideoSrc && studentStats?.remoteVideoSrc;

      if (bothConnected && bothHaveRemoteVideo) {
        successCount++;
        console.log(`✅ Check ${totalChecks}: Connected (${successCount}/${totalChecks})`);
      } else {
        console.log(`❌ Check ${totalChecks}: Not fully connected`);
        console.log(`   Tutor: connected=${tutorStats?.connected}, remoteVideo=${tutorStats?.remoteVideoSrc}`);
        console.log(`   Student: connected=${studentStats?.connected}, remoteVideo=${studentStats?.remoteVideoSrc}`);
      }

      await tutor.page.waitForTimeout(2000);
    }

    // Calculate success rate
    const successRate = (successCount / totalChecks * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('📈 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${totalChecks - successCount}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log('='.repeat(60));

    if (lastTutorStats && lastStudentStats) {
      console.log('\n📊 Final Status:');
      console.log('Tutor:', JSON.stringify(lastTutorStats, null, 2));
      console.log('Student:', JSON.stringify(lastStudentStats, null, 2));
    }

    // Evaluate result
    if (parseFloat(successRate) >= 90) {
      console.log('\n✅ TEST PASSED - Connection stability >= 90%');
      return true;
    } else {
      console.log('\n❌ TEST FAILED - Connection stability < 90%');
      console.log('🔧 Issues detected - need to fix connection logic');
      return false;
    }

  } catch (err) {
    console.error('\n❌ Test Error:', err);
    return false;
  } finally {
    console.log('\n🧹 Cleaning up...');
    if (tutor) await tutor.browser.close();
    if (student) await student.browser.close();
  }
}

// Run the test
runTest()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
