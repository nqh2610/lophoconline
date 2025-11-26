/**
 * Video Call P2P - CRITICAL Test Cases (Tests 1-5)
 * Tests essential connection scenarios
 * 
 * Run: node test-video-call-critical.mjs
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
  testRoomId: 'critical-test-' + Date.now(),
  headless: false,
  slowMo: 30,
  timeout: 60000,
  screenshotDir: './test-screenshots/critical',
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
  
  let attempts = 0;
  const connected = await waitFor(async () => {
    attempts++;
    if (attempts % 10 === 0) {
      const state = await page.evaluate(() => {
        const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                           document.querySelector('video:not([data-testid="local-video"])');
        const state = window.__VIDEOLIFY_TEST_STATE__ || {};
        return {
          hasRemoteVideo: !!remoteVideo,
          hasSrcObject: remoteVideo ? !!remoteVideo.srcObject : false,
          isActive: remoteVideo && remoteVideo.srcObject ? remoteVideo.srcObject.active : false,
          iceState: state.iceConnectionState || 'unknown',
          peerCount: state.peerCount || 0,
        };
      });
      console.log(`[${peerId}] Check ${attempts/10}: ${JSON.stringify(state)}`);
    }
    
    return await page.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                         document.querySelector('video:not([data-testid="local-video"])');
      return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
    });
  }, 40000);
  
  if (!connected) {
    const finalState = await page.evaluate(() => {
      const state = window.__VIDEOLIFY_TEST_STATE__ || {};
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      return {
        peerConnected: state.peerConnected || false,
        iceConnectionState: state.iceConnectionState || 'unknown',
        peerCount: state.peerCount || 0,
        hasRemoteVideo: !!remoteVideo,
        sseConnected: state.sseConnected || false,
      };
    });
    console.error(`[${peerId}] Final state:`, JSON.stringify(finalState, null, 2));
    throw new Error(`[${peerId}] Connection timeout after 40s`);
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

async function getConnectionStats(page, peerId) {
  return await page.evaluate(() => {
    const stats = window.__VIDEOLIFY_TEST_STATE__ || {};
    return {
      connected: stats.peerConnected || false,
      iceState: stats.iceConnectionState || 'unknown',
      channels: stats.channelStates || {},
    };
  });
}

// ============================================================================
// Test Runner
// ============================================================================

class CriticalTestRunner {
  constructor() {
    this.browserA = null;
    this.browserB = null;
    this.pageA = null;
    this.pageB = null;
  }

  async setup() {
    console.log('\n🚀 Khởi động CRITICAL test environment...\n');
    
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
  // CRITICAL TEST CASES (1-5)
  // ============================================================================

  // TEST 1: Kết nối P2P ổn định cơ bản
  async testBasicConnection() {
    await this.runTest(
      'Kết nối P2P ổn định không gián đoạn',
      'CRITICAL: Kiểm tra kết nối P2P ổn định trong 5 phút',
      async () => {
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.joinRoom(this.pageB, 'B');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('Monitoring connection stability for 5 minutes...');
        const testDuration = 5 * 60 * 1000; // 5 minutes
        const checkInterval = 10000; // Check every 10s
        const checks = testDuration / checkInterval;
        
        for (let i = 1; i <= checks; i++) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          
          const statsA = await getConnectionStats(this.pageA, 'A');
          const statsB = await getConnectionStats(this.pageB, 'B');
          
          console.log(`Check ${i}/${checks}: A=${statsA.iceState}, B=${statsB.iceState}`);
          
          if (statsA.iceState === 'failed' || statsB.iceState === 'failed') {
            throw new Error(`Connection failed at check ${i}`);
          }
        }
        
        console.log('✅ Connection stable for 5 minutes');
      }
    );
  }

  // TEST 2: F5/Refresh Browser
  async testF5Refresh() {
    await this.runTest(
      'Test F5/Refresh Browser',
      'CRITICAL: Test F5 refresh với sessionStorage persistence',
      async () => {
        console.log('[A] Refreshing page (F5)...');
        await this.pageA.reload({ waitUntil: 'domcontentloaded' });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('[A] Waiting for reconnection...');
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('✅ Reconnected after F5');
      }
    );
  }

  // TEST 3: Mạng rớt tạm thời
  async testNetworkGlitch() {
    await this.runTest(
      'Test mạng rớt tạm thời',
      'CRITICAL: Mạng offline 5 giây rồi online lại',
      async () => {
        console.log('[A] Going offline for 5 seconds...');
        const client = await this.pageA.target().createCDPSession();
        await client.send('Network.emulateNetworkConditions', {
          offline: true,
          downloadThroughput: 0,
          uploadThroughput: 0,
          latency: 0,
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('[A] Going back online...');
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0,
        });
        
        console.log('[A] Waiting for reconnection...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await waitForConnection(this.pageA, 'A');
        console.log('✅ Reconnected after network glitch');
      }
    );
  }

  // TEST 4: Mạng không ổn định (Packet Loss)
  async testUnstableNetwork() {
    await this.runTest(
      'Test mạng không ổn định',
      'CRITICAL: 10% packet loss + 200ms latency trong 30 giây',
      async () => {
        console.log('[A] Simulating unstable network (10% loss, 200ms latency)...');
        const client = await this.pageA.target().createCDPSession();
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: 500 * 1024 / 8,
          uploadThroughput: 500 * 1024 / 8,
          latency: 200,
          packetLoss: 10,
        });
        
        console.log('[A] Unstable network for 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const stillConnected = await this.pageA.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                             document.querySelector('video:not([data-testid="local-video"])');
          return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
        });
        
        if (!stillConnected) {
          throw new Error('Connection lost during unstable network');
        }
        
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0,
        });
        
        console.log('✅ Connection maintained through unstable network');
      }
    );
  }

  // TEST 5: Reconnect sau disconnect
  async testReconnectAfterDisconnect() {
    await this.runTest(
      'Test reconnect sau disconnect',
      'CRITICAL: Đóng browser → Mở lại với localStorage',
      async () => {
        console.log('[A] Closing browser...');
        await this.pageA.close();
        await this.browserA.close();
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('[A] Reopening browser...');
        this.browserA = await puppeteer.launch({
          headless: CONFIG.headless,
          slowMo: CONFIG.slowMo,
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--disable-web-security',
          ],
        });
        
        this.pageA = await this.browserA.newPage();
        await this.pageA.setViewport({ width: 1280, height: 720 });
        this.pageA.on('console', msg => console.log(`[Peer A] ${msg.text()}`));
        await this.pageA.evaluateOnNewDocument(() => {
          window.__VIDEOLIFY_TEST_MODE__ = true;
        });
        
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('[A] Waiting for reconnection...');
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('✅ Reconnected successfully');
      }
    );
  }

  // ============================================================================
  // Main Runner
  // ============================================================================

  async runAll() {
    try {
      await this.setup();
      
      console.log('\n🎯 RUNNING 5 CRITICAL TESTS\n');
      
      await this.testBasicConnection();
      
      if (testResults.failed === 0) {
        await this.testF5Refresh();
      }
      
      if (testResults.failed === 0) {
        await this.testNetworkGlitch();
      }
      
      if (testResults.failed === 0) {
        await this.testUnstableNetwork();
      }
      
      if (testResults.failed === 0) {
        await this.testReconnectAfterDisconnect();
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
    console.log('📊 TEST SUMMARY - CRITICAL TESTS (1-5)');
    console.log('='.repeat(80));
    console.log(`Total: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Pass Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    console.log('='.repeat(80));
    
    testResults.tests.forEach((test, index) => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      const time = (test.duration / 1000).toFixed(2);
      console.log(`${icon} Test ${index + 1}: ${test.name} (${time}s)`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });
    console.log('='.repeat(80) + '\n');
  }
}

// ============================================================================
// Run Tests
// ============================================================================

const runner = new CriticalTestRunner();
runner.runAll();
