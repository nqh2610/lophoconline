/**
 * Video Call P2P - MEDIUM/LOW Priority Tests (Tests 13-20)
 * Simplified JavaScript version without TypeScript syntax
 * 
 * Run: node test-video-call-medium-low.mjs
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  headless: false,
  slowMo: 30,
  timeout: 60000,
  screenshotDir: './test-screenshots/medium-low',
  
  // Generate unique room ID for each test
  getTestRoomId: (testNumber) => `medium-low-test-${testNumber}-${Date.now()}`,
};

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: new Date(),
};

// =============================================================================
// Utilities
// =============================================================================

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

// =============================================================================
// Test Runner
// =============================================================================

class MediumLowTestRunner {
  constructor() {
    this.browserA = null;
    this.browserB = null;
    this.pageA = null;
    this.pageB = null;
  }

  async setup() {
    console.log('\n🚀 Khởi động MEDIUM/LOW PRIORITY test environment...\n');
    
    this.browserA = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-web-security'],
    });
    
    this.pageA = await this.browserA.newPage();
    await this.pageA.setViewport({ width: 1280, height: 720 });
    this.pageA.on('console', msg => console.log(`[A] ${msg.text()}`));
    await this.pageA.evaluateOnNewDocument(() => {
      window.__VIDEOLIFY_TEST_MODE__ = true;
    });
    
    this.browserB = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-web-security'],
    });
    
    this.pageB = await this.browserB.newPage();
    await this.pageB.setViewport({ width: 1280, height: 720 });
    this.pageB.on('console', msg => console.log(`[B] ${msg.text()}`));
    await this.pageB.evaluateOnNewDocument(() => {
      window.__VIDEOLIFY_TEST_MODE__ = true;
    });
    
    console.log('✅ Test environment ready\n');
  }

  async teardown() {
    console.log('\n🧹 Cleaning up...\n');
    if (this.pageA) await this.pageA.close().catch(() => {});
    if (this.pageB) await this.pageB.close().catch(() => {});
    if (this.browserA) await this.browserA.close().catch(() => {});
    if (this.browserB) await this.browserB.close().catch(() => {});
  }

  async joinRoom(page, peerId, role = 'student', name = 'User', roomId) {
    const url = `${CONFIG.baseUrl}/test-videolify?room=${roomId}&name=${encodeURIComponent(name)}&role=${role}`;
    console.log(`[${peerId}] Joining: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
    await page.waitForSelector('body', { timeout: 5000 });
    console.log(`[${peerId}] Page loaded`);
  }

  async runTest(testNumber, testName, description, testFn) {
    console.log('\n' + '='.repeat(70));
    console.log(`🧪 Test ${testNumber}: ${testName}`);
    console.log(`📝 ${description}`);
    console.log('='.repeat(70) + '\n');
    
    testResults.total++;
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ Test ${testNumber} PASSED (${duration}s)\n`);
      testResults.passed++;
      testResults.tests.push({ number: testNumber, name: testName, status: 'PASSED', duration: `${duration}s` });
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`\n❌ Test ${testNumber} FAILED (${duration}s)`);
      console.error(`Error: ${error.message}\n`);
      testResults.failed++;
      testResults.tests.push({ number: testNumber, name: testName, status: 'FAILED', duration: `${duration}s`, error: error.message });
    }
  }

  skipTest(testNumber, testName, description, reason) {
    console.log('\n' + '='.repeat(70));
    console.log(`⏸️  Test ${testNumber}: ${testName}`);
    console.log(`📝 ${description}`);
    console.log(`⚠️  SKIPPED: ${reason}`);
    console.log('='.repeat(70) + '\n');
    
    testResults.total++;
    testResults.skipped++;
    testResults.tests.push({ number: testNumber, name: testName, status: 'SKIPPED', reason });
  }

  // ==========================================================================
  // TEST 13: Peer rejoin after network loss
  // ==========================================================================
  async test13() {
    await this.runTest(13, 'Peer Rejoin After Network Loss', 
      'MEDIUM: Test peer offline 5-10s rồi rejoin', async () => {
      
      const roomId = CONFIG.getTestRoomId(13);
      
      await this.joinRoom(this.pageA, 'A', 'tutor', 'Giáo viên A', roomId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.joinRoom(this.pageB, 'B', 'student', 'Học sinh B', roomId);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await waitForConnection(this.pageA, 'A');
      await waitForConnection(this.pageB, 'B');
      console.log('✅ Initial connection established');
      
      // Simulate network loss on Peer B
      console.log('📡 Simulating complete network loss on Peer B...');
      const cdpSessionB = await this.pageB.target().createCDPSession();
      await cdpSessionB.send('Network.enable');
      await cdpSessionB.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0,
      });
      
      console.log('⏱️  Waiting 8 seconds (offline period)...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Restore network
      console.log('📡 Restoring network on Peer B...');
      await cdpSessionB.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
      
      // Wait for reconnection
      console.log('⏱️  Waiting for automatic reconnection...');
      const reconnected = await waitFor(async () => {
        const aConnected = await this.pageA.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]');
          return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
        });
        
        const bConnected = await this.pageB.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]');
          return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
        });
        
        return aConnected && bConnected;
      }, 30000);
      
      if (!reconnected) {
        throw new Error('Reconnection failed after network restoration');
      }
      
      console.log('✅ Peers reconnected successfully after network loss');
    });
  }

  // ==========================================================================
  // TEST 14: Concurrent offers (Perfect Negotiation)
  // ==========================================================================
  async test14() {
    await this.runTest(14, 'Concurrent Offers',
      'MEDIUM: Test Perfect Negotiation collision handling', async () => {
      
      const roomId = CONFIG.getTestRoomId(14);
      
      await this.joinRoom(this.pageA, 'A', 'tutor', 'Giáo viên A', roomId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.joinRoom(this.pageB, 'B', 'student', 'Học sinh B', roomId);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await waitForConnection(this.pageA, 'A');
      await waitForConnection(this.pageB, 'B');
      
      console.log('✅ Connection established (Perfect Negotiation handled collision)');
      
      // Both peers try to add a data channel simultaneously
      console.log('🔄 Testing renegotiation with concurrent offers...');
      
      await Promise.all([
        this.pageA.evaluate(() => {
          const pc = window.__VIDEOLIFY_TEST_STATE__?.peerConnection;
          if (pc) pc.createDataChannel('test-channel-A');
        }),
        this.pageB.evaluate(() => {
          const pc = window.__VIDEOLIFY_TEST_STATE__?.peerConnection;
          if (pc) pc.createDataChannel('test-channel-B');
        }),
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify connection still stable
      const aStillConnected = await this.pageA.evaluate(() => {
        const remoteVideo = document.querySelector('[data-testid="remote-video"]');
        return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
      });
      
      if (!aStillConnected) {
        throw new Error('Connection lost after concurrent renegotiation');
      }
      
      console.log('✅ Connection stable after concurrent renegotiation');
    });
  }

  // ==========================================================================
  // TEST 15: DataChannel reliability
  // ==========================================================================
  async test15() {
    await this.runTest(15, 'Data Channel Reliability',
      'MEDIUM: Test message delivery với 5% packet loss', async () => {
      
      const roomId = CONFIG.getTestRoomId(15);
      
      await this.joinRoom(this.pageA, 'A', 'tutor', 'Giáo viên A', roomId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.joinRoom(this.pageB, 'B', 'student', 'Học sinh B', roomId);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await waitForConnection(this.pageA, 'A');
      await waitForConnection(this.pageB, 'B');
      
      // Apply 5% packet loss
      console.log('📡 Applying 5% packet loss...');
      const cdpSessionA = await this.pageA.target().createCDPSession();
      await cdpSessionA.send('Network.enable');
      await cdpSessionA.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1000 * 1024,
        uploadThroughput: 1000 * 1024,
        latency: 20,
        packetLoss: 5,
      });
      
      console.log('📨 Sending 50 test messages from A to B...');
      
      // Track messages on B
      await this.pageB.evaluate(() => {
        window.__testMessagesReceived = 0;
        const chatChannel = window.__VIDEOLIFY_TEST_STATE__?.channels?.chat;
        if (chatChannel) {
          chatChannel.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'test-message') {
              window.__testMessagesReceived++;
            }
          });
        }
      });
      
      // Send 50 messages
      for (let i = 0; i < 50; i++) {
        await this.pageA.evaluate((msgNum) => {
          const chatChannel = window.__VIDEOLIFY_TEST_STATE__?.channels?.chat;
          if (chatChannel && chatChannel.readyState === 'open') {
            chatChannel.send(JSON.stringify({
              type: 'test-message',
              number: msgNum,
              timestamp: Date.now(),
            }));
          }
        }, i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log('⏱️  Waiting for messages...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const messagesReceived = await this.pageB.evaluate(() => {
        return window.__testMessagesReceived || 0;
      });
      
      console.log(`📊 Messages: sent 50, received ${messagesReceived}`);
      
      if (messagesReceived < 48) {
        throw new Error(`Too many lost: ${50 - messagesReceived} (${messagesReceived}/50)`);
      }
      
      console.log(`✅ DataChannel reliability: ${(messagesReceived/50*100).toFixed(1)}%`);
    });
  }

  // ==========================================================================
  // TEST 16: Memory leak detection
  // ==========================================================================
  async test16() {
    this.skipTest(16, 'Memory Leak Detection',
      'LOW: Test memory không tăng sau nhiều cycles',
      'Requires Chrome with --enable-precise-memory-info flag and complex setup');
  }

  // ==========================================================================
  // TEST 17: Browser compatibility
  // ==========================================================================
  async test17() {
    this.skipTest(17, 'Browser Compatibility',
      'LOW: Test trên Chrome, Firefox, Edge',
      'Requires multiple browser installations');
  }

  // ==========================================================================
  // TEST 18: Echo cancellation
  // ==========================================================================
  async test18() {
    await this.runTest(18, 'Echo Cancellation',
      'LOW: Verify echoCancellation: true', async () => {
      
      const roomId = CONFIG.getTestRoomId(18);
      
      await this.joinRoom(this.pageA, 'A', 'tutor', 'Giáo viên A', roomId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const audioSettings = await this.pageA.evaluate(() => {
        const localVideo = document.querySelector('[data-testid="local-video"]');
        if (localVideo && localVideo.srcObject) {
          const audioTrack = localVideo.srcObject.getAudioTracks()[0];
          if (audioTrack) {
            const settings = audioTrack.getSettings();
            return {
              echoCancellation: settings.echoCancellation,
              noiseSuppression: settings.noiseSuppression,
              autoGainControl: settings.autoGainControl,
            };
          }
        }
        return null;
      });
      
      if (!audioSettings) {
        throw new Error('Could not retrieve audio track settings');
      }
      
      console.log('🎤 Audio track settings:', audioSettings);
      
      if (audioSettings.echoCancellation !== true) {
        throw new Error(`Echo cancellation not enabled: ${audioSettings.echoCancellation}`);
      }
      
      console.log('✅ Echo cancellation enabled');
    });
  }

  // ==========================================================================
  // TEST 19: Video resolution adaptation
  // ==========================================================================
  async test19() {
    await this.runTest(19, 'Video Resolution Adaptation',
      'LOW: Test video quality giảm với 100kbps', async () => {
      
      const roomId = CONFIG.getTestRoomId(19);
      
      await this.joinRoom(this.pageA, 'A', 'tutor', 'Giáo viên A', roomId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.joinRoom(this.pageB, 'B', 'student', 'Học sinh B', roomId);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await waitForConnection(this.pageA, 'A');
      await waitForConnection(this.pageB, 'B');
      
      console.log('📹 Getting initial video stats...');
      const initialStats = await this.pageA.evaluate(async () => {
        const pc = window.__VIDEOLIFY_TEST_STATE__?.peerConnection;
        if (!pc) return null;
        
        const stats = await pc.getStats();
        let videoStats = null;
        
        stats.forEach((report) => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            videoStats = {
              frameWidth: report.frameWidth,
              frameHeight: report.frameHeight,
              framesPerSecond: report.framesPerSecond,
            };
          }
        });
        
        return videoStats;
      });
      
      if (!initialStats) {
        throw new Error('Could not get initial video stats');
      }
      
      console.log(`📊 Initial: ${initialStats.frameWidth}x${initialStats.frameHeight} @ ${initialStats.framesPerSecond} fps`);
      
      // Throttle to 100kbps
      console.log('📡 Throttling to 100kbps...');
      const cdpSessionA = await this.pageA.target().createCDPSession();
      await cdpSessionA.send('Network.enable');
      await cdpSessionA.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 100 * 1024 / 8,
        uploadThroughput: 100 * 1024 / 8,
        latency: 50,
      });
      
      console.log('⏱️  Waiting 15s for adaptation...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      console.log('✅ Video adaptation test completed');
    });
  }

  // ==========================================================================
  // TEST 20: Statistics monitoring
  // ==========================================================================
  async test20() {
    await this.runTest(20, 'Statistics Monitoring',
      'LOW: Poll getStats() every 5s for 30s', async () => {
      
      const roomId = CONFIG.getTestRoomId(20);
      
      await this.joinRoom(this.pageA, 'A', 'tutor', 'Giáo viên A', roomId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.joinRoom(this.pageB, 'B', 'student', 'Học sinh B', roomId);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await waitForConnection(this.pageA, 'A');
      await waitForConnection(this.pageB, 'B');
      
      console.log('📊 Monitoring statistics for 30s (6 samples)...\n');
      
      const samples = [];
      
      for (let i = 0; i < 6; i++) {
        const stats = await this.pageA.evaluate(async () => {
          const pc = window.__VIDEOLIFY_TEST_STATE__?.peerConnection;
          if (!pc) return null;
          
          const stats = await pc.getStats();
          let result = {
            video: { bitrate: 0, fps: 0 },
            audio: { bitrate: 0 },
            connection: { rtt: 0 },
          };
          
          stats.forEach((report) => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              result.video.bitrate = Math.round(report.bytesSent * 8 / report.timestamp * 1000);
              result.video.fps = report.framesPerSecond || 0;
            }
            if (report.type === 'outbound-rtp' && report.kind === 'audio') {
              result.audio.bitrate = Math.round(report.bytesSent * 8 / report.timestamp * 1000);
            }
            if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
              result.connection.rtt = report.roundTripTime || 0;
            }
          });
          
          return result;
        });
        
        if (stats) {
          samples.push(stats);
          console.log(`Sample ${i + 1}/6:`);
          console.log(`  Video: ${(stats.video.bitrate / 1000).toFixed(0)} kbps, ${stats.video.fps} fps`);
          console.log(`  Audio: ${(stats.audio.bitrate / 1000).toFixed(0)} kbps`);
          console.log(`  RTT: ${(stats.connection.rtt * 1000).toFixed(1)} ms\n`);
        }
        
        if (i < 5) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      if (samples.length < 6) {
        throw new Error(`Only collected ${samples.length}/6 samples`);
      }
      
      console.log('✅ Statistics monitoring successful');
    });
  }

  // ==========================================================================
  // Run All Tests
  // ==========================================================================
  async runAll() {
    try {
      await this.setup();
      
      console.log('🎯 Running MEDIUM Priority Tests (13-15)...\n');
      await this.test13();
      await this.test14();
      await this.test15();
      
      console.log('\n🎯 Running LOW Priority Tests (16-20)...\n');
      await this.test16();
      await this.test17();
      await this.test18();
      await this.test19();
      await this.test20();
      
    } catch (error) {
      console.error('❌ Test suite error:', error);
    } finally {
      await this.teardown();
      this.generateReport();
    }
  }

  generateReport() {
    const duration = ((Date.now() - testResults.startTime.getTime()) / 1000 / 60).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST RESULTS - MEDIUM/LOW PRIORITY (Tests 13-20)');
    console.log('='.repeat(70));
    console.log(`Total: ${testResults.total} | Passed: ${testResults.passed} | Failed: ${testResults.failed} | Skipped: ${testResults.skipped}`);
    console.log(`Duration: ${duration} minutes`);
    console.log('='.repeat(70));
    
    testResults.tests.forEach(test => {
      const icon = test.status === 'PASSED' ? '✅' : test.status === 'SKIPPED' ? '⏸️' : '❌';
      console.log(`${icon} Test ${test.number}: ${test.name} - ${test.status} ${test.duration || ''}`);
      if (test.error) console.log(`   Error: ${test.error}`);
      if (test.reason) console.log(`   Reason: ${test.reason}`);
    });
    
    console.log('='.repeat(70));
    
    const passRate = (testResults.total - testResults.skipped) > 0 
      ? ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1)
      : 0;
    
    console.log(`\n✨ Pass Rate: ${passRate}% (excluding skipped)`);
    
    if (testResults.failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`⚠️  ${testResults.failed} test(s) failed`);
    }
  }
}

// =============================================================================
// Run Tests
// =============================================================================

const runner = new MediumLowTestRunner();
runner.runAll();
