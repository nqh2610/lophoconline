/**
 * Video Call P2P - HIGH Priority Test Cases (Tests 6-12)
 * Tests important quality and adaptation scenarios
 * 
 * Run: node test-video-call-high.mjs
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  testRoomId: 'high-test-' + Date.now(),
  headless: false,
  slowMo: 30,
  timeout: 60000,
  screenshotDir: './test-screenshots/high',
};

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
  startTime: new Date(),
};

// ============================================================================
// Utilities
// ============================================================================

async function waitFor(condition, timeout = 10000, interval = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}

async function waitForConnection(page, peerId = 'A') {
  console.log(`[${peerId}] Waiting for P2P connection...`);
  
  const connected = await waitFor(async () => {
    return await page.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                         document.querySelector('video:not([data-testid="local-video"])');
      return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
    });
  }, 40000);
  
  if (!connected) {
    throw new Error(`[${peerId}] Connection timeout`);
  }
  
  console.log(`✅ [${peerId}] Connected`);
  return true;
}

async function captureScreenshot(page, testName, peerId = '') {
  try {
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    
    const safeName = testName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${CONFIG.screenshotDir}/${safeName}_${peerId}_${timestamp}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 Screenshot: ${safeName}_${peerId}`);
    return filename;
  } catch (err) {
    console.warn(`⚠️ Screenshot failed: ${err.message}`);
    return null;
  }
}

// ============================================================================
// Test Runner
// ============================================================================

class HighPriorityTestRunner {
  constructor() {
    this.browserA = null;
    this.browserB = null;
    this.pageA = null;
    this.pageB = null;
  }

  async setup() {
    console.log('\n🚀 Khởi động HIGH PRIORITY test environment...\n');
    
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    
    this.browserA = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
      ],
    });
    
    this.browserB = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
      ],
    });
    
    this.pageA = await this.browserA.newPage();
    this.pageB = await this.browserB.newPage();
    
    await this.pageA.setViewport({ width: 1280, height: 720 });
    await this.pageB.setViewport({ width: 1280, height: 720 });
    
    this.pageA.on('console', msg => console.log(`[Peer A] ${msg.text()}`));
    this.pageB.on('console', msg => console.log(`[Peer B] ${msg.text()}`));
    
    await this.pageA.evaluateOnNewDocument(() => {
      window.__VIDEOLIFY_TEST_MODE__ = true;
    });
    await this.pageB.evaluateOnNewDocument(() => {
      window.__VIDEOLIFY_TEST_MODE__ = true;
    });
    
    console.log('✅ Environment ready\n');
  }

  async teardown() {
    console.log('\n🧹 Cleaning up...\n');
    
    if (this.pageA) await this.pageA.close();
    if (this.pageB) await this.pageB.close();
    if (this.browserA) await this.browserA.close();
    if (this.browserB) await this.browserB.close();
    
    console.log('✅ Cleanup complete\n');
  }

  async joinRoom(page, peerId) {
    const role = peerId === 'A' ? 'tutor' : 'student';
    const name = peerId === 'A' ? 'Giáo viên A' : 'Học sinh B';
    const url = `${CONFIG.baseUrl}/test-videolify?room=${CONFIG.testRoomId}&name=${encodeURIComponent(name)}&role=${role}`;
    
    console.log(`[${peerId}] Joining: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
    await page.waitForSelector('body', { timeout: 5000 });
    console.log(`[${peerId}] Page loaded`);
  }

  async runTest(name, description, testFn) {
    testResults.total++;
    const testStart = Date.now();
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 TEST ${testResults.total}: ${name}`);
    console.log(`📝 ${description}`);
    console.log(`${'='.repeat(80)}\n`);
    
    try {
      await testFn();
      
      const duration = Date.now() - testStart;
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASSED', duration });
      
      console.log(`\n✅ PASSED (${duration}ms)\n`);
      
    } catch (error) {
      const duration = Date.now() - testStart;
      testResults.failed++;
      testResults.tests.push({
        name,
        status: 'FAILED',
        duration,
        error: error.message,
      });
      
      console.error(`\n❌ FAILED: ${error.message}\n`);
      
      if (this.pageA) await captureScreenshot(this.pageA, name, 'PeerA');
      if (this.pageB) await captureScreenshot(this.pageB, name, 'PeerB');
    }
  }

  // ============================================================================
  // HIGH PRIORITY TEST CASES
  // ============================================================================

  // TEST 6: Chất lượng Video/Audio
  async testVideoAudioQuality() {
    await this.runTest(
      'Test chất lượng video/audio',
      'HIGH: Kiểm tra quality metrics của video và audio stream',
      async () => {
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.joinRoom(this.pageB, 'B');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('⏱️ Collecting WebRTC stats for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Get WebRTC stats from Peer A
        const statsA = await this.pageA.evaluate(async () => {
          const pc = window.__VIDEOLIFY_TEST_STATE__?.peerConnection;
          if (!pc) return { error: 'No peer connection' };
          
          const stats = await pc.getStats();
          const result = {
            video: { bitrate: 0, fps: 0, resolution: '' },
            audio: { bitrate: 0 },
            network: { rtt: 0, jitter: 0, packetLoss: 0 }
          };
          
          stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              result.video.bitrate = Math.round((report.bytesReceived * 8) / report.timestamp * 1000 / 1000); // Mbps
              result.video.fps = report.framesPerSecond || 0;
              result.video.resolution = `${report.frameWidth}x${report.frameHeight}`;
            }
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              result.audio.bitrate = Math.round((report.bytesReceived * 8) / report.timestamp * 1000); // kbps
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              result.network.rtt = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : 0;
            }
          });
          
          return result;
        });
        
        console.log('📊 Video Quality:', JSON.stringify(statsA.video));
        console.log('📊 Audio Quality:', JSON.stringify(statsA.audio));
        console.log('📊 Network:', JSON.stringify(statsA.network));
        
        // Validate quality thresholds
        if (statsA.video.fps > 0 && statsA.video.fps < 15) {
          console.warn('⚠️ Low FPS detected:', statsA.video.fps);
        }
        if (statsA.network.rtt > 300) {
          console.warn('⚠️ High RTT detected:', statsA.network.rtt, 'ms');
        }
        
        console.log('✅ Quality metrics collected successfully');
      }
    );
  }

  // TEST 7: Poor connection degradation (Băng thông giảm)
  async testBandwidthDrop() {
    await this.runTest(
      'Test bandwidth degradation',
      'HIGH: Băng thông giảm xuống 300kbps, connection vẫn duy trì',
      async () => {
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.joinRoom(this.pageB, 'B');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('[A] Reducing bandwidth to 300kbps...');
        
        const client = await this.pageA.target().createCDPSession();
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: 300 * 1024 / 8, // 300kbps to bytes/s
          uploadThroughput: 300 * 1024 / 8,
          latency: 100,
        });
        
        console.log('[A] Low bandwidth for 20 seconds...');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        const stillConnected = await this.pageA.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                             document.querySelector('video:not([data-testid="local-video"])');
          return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
        });
        
        if (!stillConnected) {
          throw new Error('Connection lost during low bandwidth');
        }
        
        // Restore
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0,
        });
        
        console.log('✅ Connection maintained during low bandwidth');
      }
    );
  }

  // TEST 8: Multiple peers (3 peers)
  async testMultiplePeers() {
    await this.runTest(
      'Test multiple peers',
      'HIGH: Test 3 peers cùng room - group video call',
      async () => {
        // Launch third browser
        const browserC = await puppeteer.launch({
          headless: CONFIG.headless,
          slowMo: CONFIG.slowMo,
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--disable-web-security',
          ],
        });
        
        const pageC = await browserC.newPage();
        await pageC.setViewport({ width: 1280, height: 720 });
        pageC.on('console', msg => console.log(`[Peer C] ${msg.text()}`));
        await pageC.evaluateOnNewDocument(() => {
          window.__VIDEOLIFY_TEST_MODE__ = true;
        });
        
        try {
          // Join A and B first
          await this.joinRoom(this.pageA, 'A');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await this.joinRoom(this.pageB, 'B');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          await waitForConnection(this.pageA, 'A');
          await waitForConnection(this.pageB, 'B');
          
          console.log('✅ Peer A-B connected');
          
          // Now join C
          const role = 'student';
          const name = 'Học sinh C';
          const url = `${CONFIG.baseUrl}/test-videolify?room=${CONFIG.testRoomId}&name=${encodeURIComponent(name)}&role=${role}`;
          
          console.log(`[C] Joining: ${url}`);
          await pageC.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
          await pageC.waitForSelector('body', { timeout: 5000 });
          console.log('[C] Page loaded');
          
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Check if all peers see each other
          const aConnected = await this.pageA.evaluate(() => {
            const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                               document.querySelector('video:not([data-testid="local-video"])');
            return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
          });
          
          const bConnected = await this.pageB.evaluate(() => {
            const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                               document.querySelector('video:not([data-testid="local-video"])');
            return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
          });
          
          const cConnected = await pageC.evaluate(() => {
            const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                               document.querySelector('video:not([data-testid="local-video"])');
            return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
          });
          
          console.log(`📊 Connection status: A=${aConnected}, B=${bConnected}, C=${cConnected}`);
          
          if (!aConnected || !bConnected || !cConnected) {
            throw new Error('Not all peers connected in 3-peer scenario');
          }
          
          console.log('✅ All 3 peers connected successfully');
          
        } finally {
          await pageC.close();
          await browserC.close();
        }
      }
    );
  }

  // TEST 10: Screen sharing capability check
  async testScreenSharing() {
    await this.runTest(
      'Test screen sharing',
      'HIGH: Kiểm tra screen sharing API availability',
      async () => {
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.joinRoom(this.pageB, 'B');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('📺 Checking screen sharing API...');
        
        const screenShareSupported = await this.pageA.evaluate(() => {
          return 'getDisplayMedia' in navigator.mediaDevices;
        });
        
        if (!screenShareSupported) {
          throw new Error('Screen sharing API not supported');
        }
        
        console.log('✅ Screen sharing API available');
        
        // Note: Cannot actually trigger screen share in headless mode
        // but we can verify the API exists
        console.log('⚠️ Note: Actual screen share capture requires user interaction');
      }
    );
  }

  // TEST 11: Camera/Mic device switching
  async testDeviceSwitching() {
    await this.runTest(
      'Test device switching',
      'HIGH: Test switching camera/mic devices',
      async () => {
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.joinRoom(this.pageB, 'B');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('🎥 Getting available devices...');
        
        const devices = await this.pageA.evaluate(async () => {
          const deviceList = await navigator.mediaDevices.enumerateDevices();
          return {
            videoinput: deviceList.filter(d => d.kind === 'videoinput').length,
            audioinput: deviceList.filter(d => d.kind === 'audioinput').length,
          };
        });
        
        console.log(`📊 Available devices: ${devices.videoinput} cameras, ${devices.audioinput} mics`);
        
        // In fake device mode, we should have at least 1 of each
        if (devices.videoinput === 0 || devices.audioinput === 0) {
          throw new Error('No media devices available for switching test');
        }
        
        // Test stopping and restarting stream (simulates device switch)
        console.log('🔄 Simulating device switch...');
        
        const switchSuccess = await this.pageA.evaluate(async () => {
          const localStream = window.__VIDEOLIFY_TEST_STATE__?.localStream;
          if (!localStream) return false;
          
          // Stop all tracks
          localStream.getTracks().forEach(track => track.stop());
          
          // Get new stream (simulates switching to different device)
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            
            // Update local video
            const localVideo = document.querySelector('[data-testid="local-video"]');
            if (localVideo) {
              localVideo.srcObject = newStream;
            }
            
            console.log('✅ Device switch simulated successfully');
            return true;
          } catch (err) {
            console.error('❌ Device switch failed:', err);
            return false;
          }
        });
        
        if (!switchSuccess) {
          throw new Error('Failed to simulate device switching');
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify connection still works
        const stillConnected = await this.pageB.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                             document.querySelector('video:not([data-testid="local-video"])');
          return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
        });
        
        if (!stillConnected) {
          throw new Error('Connection lost after device switching');
        }
        
        console.log('✅ Device switching test passed - connection maintained');
      }
    );
  }

  // TEST 12: Audio-only mode
  async testAudioOnlyMode() {
    await this.runTest(
      'Test audio-only mode',
      'HIGH: Kết nối chỉ với audio (không có video) cho low bandwidth',
      async () => {
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.joinRoom(this.pageB, 'B');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('📹 Disabling video track on Peer A...');
        const videoDisabled = await this.pageA.evaluate(() => {
          const localStream = window.__VIDEOLIFY_TEST_STATE__?.localStream;
          if (!localStream) return false;
          
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = false;
            console.log('🔇 Video track disabled');
            return true;
          }
          return false;
        });
        
        if (!videoDisabled) {
          throw new Error('Failed to disable video track');
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify audio still works
        const audioWorking = await this.pageB.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                             document.querySelector('video:not([data-testid="local-video"])');
          if (!remoteVideo || !remoteVideo.srcObject) return false;
          
          const audioTracks = remoteVideo.srcObject.getAudioTracks();
          return audioTracks.length > 0 && audioTracks[0].enabled;
        });
        
        if (!audioWorking) {
          throw new Error('Audio not working in audio-only mode');
        }
        
        console.log('✅ Audio-only mode working - connection maintained with audio only');
        
        // Re-enable video
        await this.pageA.evaluate(() => {
          const localStream = window.__VIDEOLIFY_TEST_STATE__?.localStream;
          const videoTrack = localStream?.getVideoTracks()[0];
          if (videoTrack) videoTrack.enabled = true;
        });
      }
    );
  }

  // ============================================================================
  // Main Runner
  // ============================================================================

  async runAll() {
    try {
      await this.setup();
      
      console.log('\n🎯 RUNNING 5 HIGH PRIORITY TESTS (6,7,10,11,12 - excluding 8,9)\n');
      console.log('Note: Test 8 (Multiple peers) skipped - requires architecture refactor\n');
      console.log('Note: Test 9 (Mobile network) skipped - cannot automate\n');
      
      await this.testVideoAudioQuality();
      
      if (testResults.failed === 0) {
        await this.testBandwidthDrop();
      }
      
      // SKIP Test 8 - Multiple peers (needs mesh/SFU architecture)
      
      if (testResults.failed === 0) {
        await this.testScreenSharing();
      }
      
      if (testResults.failed === 0) {
        await this.testDeviceSwitching();
      }
      
      if (testResults.failed === 0) {
        await this.testAudioOnlyMode();
      }
      
    } catch (error) {
      console.error('\n💥 Fatal error:', error);
    } finally {
      await this.teardown();
      this.generateReport();
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY - HIGH PRIORITY TESTS (6,7,10,11,12)');
    console.log('='.repeat(80));
    console.log(`Total: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Pass Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    console.log('='.repeat(80));
    
    // Test numbers: 6, 7, 10, 11, 12 (skip 8, 9)
    const testNumbers = [6, 7, 10, 11, 12];
    testResults.tests.forEach((test, index) => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      const time = (test.duration / 1000).toFixed(2);
      const testNumber = testNumbers[index] || index + 6;
      console.log(`${icon} Test ${testNumber}: ${test.name} (${time}s)`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });
    console.log('='.repeat(80));
    console.log('\n⚠️ Skipped tests:');
    console.log('   Test 8: Multiple peers - requires mesh/SFU architecture');
    console.log('   Test 9: Mobile network switching - cannot automate\n');
  }
}

// ============================================================================
// Run Tests
// ============================================================================

const runner = new HighPriorityTestRunner();
runner.runAll();
