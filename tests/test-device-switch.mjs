/**
 * TEST CASE: User Switches Device
 * 
 * Scenario:
 * 1. User1 (Chrome) và User2 (Edge) kết nối thành công
 * 2. User2 đóng trình duyệt (giả lập tắt máy)
 * 3. User2 mở lại trên "máy khác" (Edge với profile mới = localStorage khác)
 * 4. User2 vào lại cùng room URL
 * 5. Kiểm tra: User1 và User2 có reconnect được không?
 * 
 * Expected:
 * - User1 phát hiện User2 disconnected
 * - User2 (máy mới) join với peer ID mới
 * - User1 nhận peer-joined event
 * - Connection tự động thiết lập lại
 */

import playwright from 'playwright';
const { chromium } = playwright;
import { setTimeout as sleep } from 'timers/promises';

const SERVER_URL = 'http://localhost:3000';
const ROOM_ID = 'test-device-switch-' + Date.now();

async function setupBrowser(browserType, name, role, userDataDir = null) {
  const options = {
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-insecure-localhost',
      '--disable-web-security',
    ]
  };
  
  // Nếu có userDataDir = giả lập máy khác (localStorage riêng)
  if (userDataDir) {
    options.args.push(`--user-data-dir=${userDataDir}`);
  }

  const browser = await browserType.launch(options);
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${name}] ${text}`);
    
    // Print important events
    if (text.includes('P2P Connection') || 
        text.includes('peer-joined') || 
        text.includes('peer-left') ||
        text.includes('ICE connection state') ||
        text.includes('Generated new peer ID') ||
        text.includes('Restored peer ID')) {
      console.log(`[${name}] ${text}`);
    }
  });

  const url = `${SERVER_URL}/test-videolify?room=${ROOM_ID}&name=${name}&role=${role}`;
  console.log(`\n🌐 [${name}] Opening: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await sleep(2000);

  return { browser, context, page, logs };
}

async function checkConnection(page, name) {
  try {
    const state = await page.evaluate(() => {
      // Check if remote video element exists AND has valid srcObject
      const videoElement = document.querySelector('video[data-testid="remote-video"]');
      const hasRemoteVideo = videoElement && videoElement.srcObject && 
                            videoElement.srcObject.getTracks().length > 0;
      
      return {
        hasRemoteVideo,
        videoExists: !!videoElement,
        hasSrcObject: !!(videoElement && videoElement.srcObject),
        trackCount: videoElement?.srcObject?.getTracks().length || 0,
        timestamp: Date.now()
      };
    });
    
    return state;
  } catch (e) {
    console.error(`❌ [${name}] Check connection error:`, e.message);
    return { hasRemoteVideo: false, videoExists: false, hasSrcObject: false, trackCount: 0 };
  }
}

async function runTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST: User Switches Device (Different Machine with Different localStorage)');
  console.log('='.repeat(80));

  let user1, user2FirstDevice, user2SecondDevice;

  try {
    // ============================================================
    // PHASE 1: Initial Connection - User1 (Chrome) + User2 (Edge Device 1)
    // ============================================================
    console.log('\n📌 PHASE 1: Initial Connection');
    console.log('─'.repeat(80));

    user1 = await setupBrowser(chromium, 'User1-Chrome', 'tutor');
    await sleep(2000);

    user2FirstDevice = await setupBrowser(chromium, 'User2-Chrome-Device1', 'student');
    await sleep(5000); // Wait for ICE negotiation

    console.log('\n✅ Checking initial connection...');
    const user1State1 = await checkConnection(user1.page, 'User1-Chrome');
    const user2State1 = await checkConnection(user2FirstDevice.page, 'User2-Chrome-Device1');

    console.log(`User1-Chrome: Video=${user1State1.videoExists ? '✅' : '❌'}, SrcObject=${user1State1.hasSrcObject ? '✅' : '❌'}, Tracks=${user1State1.trackCount}`);
    console.log(`User2-Chrome-Device1: Video=${user2State1.videoExists ? '✅' : '❌'}, SrcObject=${user2State1.hasSrcObject ? '✅' : '❌'}, Tracks=${user2State1.trackCount}`);

    await sleep(3000);

    // ============================================================
    // PHASE 2: User2 Closes Browser (Simulate Device Shutdown)
    // ============================================================
    console.log('\n📌 PHASE 2: User2 Closes Browser (Device 1 Shutdown)');
    console.log('─'.repeat(80));

    console.log('🔴 [User2-Chrome-Device1] Closing browser...');
    await user2FirstDevice.browser.close();
    user2FirstDevice = null;

    console.log('⏳ Waiting 10s for SSE disconnect and peer-left broadcast...');
    await sleep(10000);

    const user1StateAfterDisconnect = await checkConnection(user1.page, 'User1-Chrome');
    console.log(`User1-Chrome after disconnect: Video=${user1StateAfterDisconnect.videoExists ? '❌' : '✅'}, SrcObject=${user1StateAfterDisconnect.hasSrcObject ? '❌' : '✅'}, Tracks=${user1StateAfterDisconnect.trackCount}`);
    
    if (!user1StateAfterDisconnect.hasSrcObject && user1StateAfterDisconnect.trackCount === 0) {
      console.log('  ✅ Remote video correctly cleared');
    } else {
      console.log('  ❌ Remote video NOT cleared (BUG)');
    }

    // ============================================================
    // PHASE 3: User2 Opens on Different Device (New localStorage)
    // ============================================================
    console.log('\n📌 PHASE 3: User2 Opens on Different Device (Device 2 with Fresh localStorage)');
    console.log('─'.repeat(80));

    // CRITICAL: Không dùng userDataDir để giả lập máy mới = localStorage mới = peer ID mới
    user2SecondDevice = await setupBrowser(chromium, 'User2-Chrome-Device2', 'student');
    
    console.log('⏳ Waiting 8s for ICE negotiation and connection establishment...');
    await sleep(8000);

    // ============================================================
    // PHASE 4: Verify Reconnection
    // ============================================================
    console.log('\n📌 PHASE 4: Verify Reconnection');
    console.log('─'.repeat(80));

    const user1StateFinal = await checkConnection(user1.page, 'User1-Chrome');
    const user2StateFinal = await checkConnection(user2SecondDevice.page, 'User2-Chrome-Device2');

    console.log(`User1-Chrome: Video=${user1StateFinal.videoExists ? '✅' : '❌'}, SrcObject=${user1StateFinal.hasSrcObject ? '✅' : '❌'}, Tracks=${user1StateFinal.trackCount} ${user1StateFinal.hasRemoteVideo ? '✅ RECONNECTED' : '❌ NOT RECONNECTED'}`);
    console.log(`User2-Chrome-Device2: Video=${user2StateFinal.videoExists ? '✅' : '❌'}, SrcObject=${user2StateFinal.hasSrcObject ? '✅' : '❌'}, Tracks=${user2StateFinal.trackCount} ${user2StateFinal.hasRemoteVideo ? '✅ CONNECTED' : '❌ NOT CONNECTED'}`);

    // ============================================================
    // ANALYSIS
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULT ANALYSIS');
    console.log('='.repeat(80));

    const phase1Success = user1State1.hasRemoteVideo && user2State1.hasRemoteVideo;
    const phase2Success = !user1StateAfterDisconnect.hasSrcObject && user1StateAfterDisconnect.trackCount === 0;
    const phase3Success = user1StateFinal.hasRemoteVideo && user2StateFinal.hasRemoteVideo;

    console.log(`\n✅ Phase 1 (Initial Connection): ${phase1Success ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`✅ Phase 2 (Disconnect Detection): ${phase2Success ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`✅ Phase 3 (Reconnection After Device Switch): ${phase3Success ? 'PASSED ✅' : 'FAILED ❌'}`);

    const overallResult = phase1Success && phase2Success && phase3Success;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 OVERALL: ${overallResult ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
    console.log('='.repeat(80));

    if (!phase3Success) {
      console.log('\n⚠️  ISSUE DETECTED:');
      console.log('User switching device (new localStorage/peer ID) cannot reconnect.');
      console.log('This suggests:');
      console.log('1. Server may still have old peer ID registered');
      console.log('2. peer-left event not properly triggered');
      console.log('3. Need to implement cleanup on disconnection');
    }

    // Keep browsers open for manual inspection
    console.log('\n⏳ Keeping browsers open for 30s for manual inspection...');
    await sleep(30000);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
  } finally {
    console.log('\n🧹 Cleaning up...');
    if (user1) await user1.browser.close();
    if (user2FirstDevice) await user2FirstDevice.browser.close();
    if (user2SecondDevice) await user2SecondDevice.browser.close();
  }
}

// Check if server is running
console.log('🔍 Checking if server is running on', SERVER_URL);
try {
  const response = await fetch(SERVER_URL);
  if (!response.ok) throw new Error('Server not responding');
  console.log('✅ Server is running\n');
  await runTest();
} catch (error) {
  console.error('❌ Server is not running. Please start it first:');
  console.error('   npm run dev');
  process.exit(1);
}
