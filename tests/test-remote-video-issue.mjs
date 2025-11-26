/**
 * AUTO TEST: Remote Video Issue
 * Test xem remote video có bị mất khi share màn hình không
 */

import puppeteer from 'puppeteer';

const SERVER_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 120000; // 2 minutes

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupBrowser(headless = false) {
  return await puppeteer.launch({
    headless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
      '--disable-web-security',
      '--auto-select-desktop-capture-source=Entire screen',
    ],
    dumpio: true,
  });
}

async function login(page, email, password) {
  console.log(`   Logging in as ${email}...`);
  await page.goto(`${SERVER_URL}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await sleep(2000);
}

async function createRoom(page) {
  console.log('   Creating room...');
  await page.goto(`${SERVER_URL}/dashboard`);
  await sleep(1000);
  
  // Click create room button
  const createButton = await page.$('button:has-text("Tạo phòng mới")') || 
                       await page.$('button:has-text("Create Room")');
  if (createButton) {
    await createButton.click();
  } else {
    // Fallback: navigate directly
    await page.goto(`${SERVER_URL}/room/test-room-${Date.now()}`);
  }
  
  await sleep(2000);
  return page.url();
}

async function checkRemoteVideoExists(page, label) {
  const remoteVideo = await page.$('[data-testid="remote-video"]');
  const hasStream = await page.evaluate((video) => {
    return video && video.srcObject !== null;
  }, remoteVideo);
  
  const isVisible = await page.evaluate((video) => {
    if (!video) return false;
    const style = window.getComputedStyle(video);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }, remoteVideo);
  
  console.log(`   ${label}:`);
  console.log(`      - Remote video element exists: ${!!remoteVideo}`);
  console.log(`      - Has srcObject: ${hasStream}`);
  console.log(`      - Is visible: ${isVisible}`);
  
  return { exists: !!remoteVideo, hasStream, isVisible };
}

async function getConsoleLogs(page) {
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Prevention]') || 
        text.includes('[Remote Video]') || 
        text.includes('[Debug]')) {
      logs.push(text);
    }
  });
  return logs;
}

async function testRemoteVideoIssue() {
  console.log('\n🧪 TEST: Remote Video Issue During Screen Share\n');
  console.log('=' .repeat(60));
  
  const browser1 = await setupBrowser(false);
  const browser2 = await setupBrowser(false);
  
  try {
    // Setup pages
    const tutor = await browser1.newPage();
    const student = await browser2.newPage();
    
    // Collect console logs
    const tutorLogs = [];
    const studentLogs = [];
    
    tutor.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Prevention]') || 
          text.includes('[Remote Video]') || 
          text.includes('[Debug]') ||
          text.includes('[Videolify]')) {
        tutorLogs.push(`[TUTOR] ${text}`);
        console.log(`   📝 ${text}`);
      }
    });
    
    student.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Remote Video]')) {
        studentLogs.push(`[STUDENT] ${text}`);
        console.log(`   📝 ${text}`);
      }
    });
    
    // STEP 1: Login both users
    console.log('\n📌 STEP 1: Login users');
    await login(tutor, 'tutor@test.com', 'password123');
    await login(student, 'student@test.com', 'password123');
    console.log('   ✅ Both users logged in');
    
    // STEP 2: Tutor creates room
    console.log('\n📌 STEP 2: Tutor creates room');
    const roomUrl = await createRoom(tutor);
    console.log(`   ✅ Room created: ${roomUrl}`);
    
    // STEP 3: Student joins room
    console.log('\n📌 STEP 3: Student joins room');
    await student.goto(roomUrl);
    await sleep(3000);
    console.log('   ✅ Student joined');
    
    // STEP 4: Wait for P2P connection
    console.log('\n📌 STEP 4: Wait for P2P connection');
    await sleep(5000);
    
    // Check connection status
    const tutorConnected = await tutor.evaluate(() => {
      const indicator = document.querySelector('.bg-green-500');
      return !!indicator;
    });
    
    const studentConnected = await student.evaluate(() => {
      const indicator = document.querySelector('.bg-green-500');
      return !!indicator;
    });
    
    console.log(`   Tutor connected: ${tutorConnected ? '✅' : '❌'}`);
    console.log(`   Student connected: ${studentConnected ? '✅' : '❌'}`);
    
    if (!tutorConnected || !studentConnected) {
      console.log('\n❌ FAILED: P2P connection not established');
      return;
    }
    
    // STEP 5: Check initial remote video (Student sees Tutor)
    console.log('\n📌 STEP 5: Check INITIAL remote video state');
    const initialStudent = await checkRemoteVideoExists(student, 'Student sees Tutor (BEFORE screen share)');
    
    if (!initialStudent.hasStream || !initialStudent.isVisible) {
      console.log('\n⚠️ WARNING: Remote video not working BEFORE screen share');
    } else {
      console.log('   ✅ Remote video OK before screen share');
    }
    
    // STEP 6: Tutor starts screen share
    console.log('\n📌 STEP 6: Tutor starts SCREEN SHARE');
    const screenShareBtn = await tutor.$('[data-testid="screen-share-btn"]');
    if (screenShareBtn) {
      await screenShareBtn.click();
      console.log('   🖥️ Clicked screen share button');
      await sleep(3000);
    } else {
      console.log('   ❌ Screen share button not found');
      return;
    }
    
    // STEP 7: Check remote video DURING screen share (Student sees Tutor)
    console.log('\n📌 STEP 7: Check remote video DURING screen share');
    const duringStudent = await checkRemoteVideoExists(student, 'Student sees Tutor (DURING screen share)');
    
    // STEP 8: Check tutor's local video is hidden
    console.log('\n📌 STEP 8: Check Tutor local video is HIDDEN');
    const tutorLocalHidden = await tutor.evaluate(() => {
      const localVideo = document.querySelector('[data-testid="local-video"]');
      if (!localVideo) return false;
      const style = window.getComputedStyle(localVideo);
      return style.display === 'none';
    });
    console.log(`   Tutor local video hidden: ${tutorLocalHidden ? '✅' : '❌'}`);
    
    // STEP 9: Stop screen share
    console.log('\n📌 STEP 9: Tutor STOPS screen share');
    await screenShareBtn.click();
    console.log('   🛑 Clicked screen share button (stop)');
    await sleep(3000);
    
    // STEP 10: Check remote video AFTER stopping screen share
    console.log('\n📌 STEP 10: Check remote video AFTER stopping screen share');
    const afterStudent = await checkRemoteVideoExists(student, 'Student sees Tutor (AFTER screen share stopped)');
    
    // STEP 11: Check tutor's local video is restored
    console.log('\n📌 STEP 11: Check Tutor local video is RESTORED');
    const tutorLocalVisible = await tutor.evaluate(() => {
      const localVideo = document.querySelector('[data-testid="local-video"]');
      if (!localVideo) return false;
      const style = window.getComputedStyle(localVideo);
      return style.display !== 'none';
    });
    console.log(`   Tutor local video visible: ${tutorLocalVisible ? '✅' : '❌'}`);
    
    // RESULTS
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log('\n1️⃣ BEFORE Screen Share:');
    console.log(`   Student sees Tutor: ${initialStudent.isVisible ? '✅ YES' : '❌ NO'}`);
    console.log(`   Stream exists: ${initialStudent.hasStream ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n2️⃣ DURING Screen Share:');
    console.log(`   Student sees Tutor: ${duringStudent.isVisible ? '✅ YES' : '❌ NO'}`);
    console.log(`   Stream exists: ${duringStudent.hasStream ? '✅ YES' : '❌ NO'}`);
    console.log(`   Tutor local hidden: ${tutorLocalHidden ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n3️⃣ AFTER Screen Share:');
    console.log(`   Student sees Tutor: ${afterStudent.isVisible ? '✅ YES' : '❌ NO'}`);
    console.log(`   Stream exists: ${afterStudent.hasStream ? '✅ YES' : '❌ NO'}`);
    console.log(`   Tutor local visible: ${tutorLocalVisible ? '✅ YES' : '❌ NO'}`);
    
    // Final verdict
    console.log('\n' + '='.repeat(60));
    const bugExists = !afterStudent.isVisible || !afterStudent.hasStream;
    if (bugExists) {
      console.log('❌ BUG CONFIRMED: Remote video LOST after screen share!');
      console.log('\n🔍 Debug info:');
      console.log('   Check console logs above for [Debug] Remote video status');
    } else {
      console.log('✅ TEST PASSED: Remote video works correctly!');
    }
    console.log('='.repeat(60));
    
    // Keep browsers open for manual inspection
    console.log('\n⏸️  Browsers will stay open for 30 seconds for inspection...');
    await sleep(30000);
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser1.close();
    await browser2.close();
  }
}

// Run test
testRemoteVideoIssue().catch(console.error);
