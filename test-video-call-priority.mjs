/**
 * Video Call P2P - Priority Test Cases (Automated)
 * Tests critical connection scenarios for video call stability
 * 
 * Run: node test-video-call-priority.mjs
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
  testRoomId: 'priority-test-' + Date.now(),
  headless: false,
  slowMo: 30,
  timeout: 60000,
  screenshotDir: './test-screenshots/priority',
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
  
  // Tăng timeout lên 40s và log progress
  let attempts = 0;
  const connected = await waitFor(async () => {
    attempts++;
    if (attempts % 10 === 0) {
      // Log mỗi 1 giây để debug
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
  }, 40000); // Tăng từ 20s lên 40s
  
  if (!connected) {
    // Log chi tiết trước khi throw error
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
    
    // Safe filename - remove special characters
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

class PriorityTestRunner {
  constructor() {
    this.browserA = null;
    this.browserB = null;
    this.pageA = null;
    this.pageB = null;
  }

  async setup() {
    console.log('\n🚀 Khởi động test environment...\n');
    
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    
    // Launch browsers
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
    // Use 'domcontentloaded' instead of 'networkidle2' because:
    // - SSE connection keeps network active continuously
    // - Heartbeat pings every 5s prevent network from being idle
    // - 'networkidle2' requires 500ms of no network activity (impossible with heartbeat)
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
  // PRIORITY TEST CASES
  // ============================================================================

  // TEST 1: Kết nối P2P ổn định cơ bản
  async testBasicConnection() {
    await this.runTest(
      'Kết nối P2P ổn định không gián đoạn',
      'BASELINE: Kiểm tra kết nối P2P ổn định trong 5 phút',
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
            throw new Error(`Connection failed at ${i * 10}s`);
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
      'THƯỜNG GẶP NHẤT: User bấm F5, kiểm tra auto-reconnect',
      async () => {
        console.log('[A] Refreshing page (F5)...');
        
        await this.pageA.reload({ 
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.timeout 
        });
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const reconnected = await waitFor(async () => {
          return await this.pageA.evaluate(() => {
            const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                               document.querySelector('video:not([data-testid="local-video"])');
            return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
          });
        }, 30000);
        
        if (!reconnected) {
          throw new Error('Failed to reconnect after F5');
        }
        
        console.log('✅ Reconnected successfully after F5');
      }
    );
  }

  // TEST 3: Mạng rớt tạm thời
  async testNetworkGlitch() {
    await this.runTest(
      'Test mạng rớt tạm thời',
      'THƯỜNG GẶP: Mạng rớt 5s rồi có lại',
      async () => {
        console.log('[A] Network offline...');
        await this.pageA.setOfflineMode(true);
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('[A] Network online...');
        await this.pageA.setOfflineMode(false);
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const reconnected = await waitFor(async () => {
          return await this.pageA.evaluate(() => {
            const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                               document.querySelector('video:not([data-testid="local-video"])');
            return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
          });
        }, 20000);
        
        if (!reconnected) {
          throw new Error('Failed to reconnect after network glitch');
        }
        
        console.log('✅ Auto-reconnected after network glitch');
      }
    );
  }

  // TEST 4: Mạng không ổn định (Packet Loss)
  async testUnstableNetwork() {
    await this.runTest(
      'Test mạng không ổn định',
      'ƯU TIÊN CAO: Packet loss 10%, ping cao',
      async () => {
        console.log('[A] Simulating unstable network...');
        
        const client = await this.pageA.target().createCDPSession();
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: 100 * 1024, // 100 KB/s
          uploadThroughput: 100 * 1024,
          latency: 300, // 300ms
          packetLoss: 10, // 10% packet loss
        });
        
        console.log('[A] Unstable network active for 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const stillConnected = await this.pageA.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                             document.querySelector('video:not([data-testid="local-video"])');
          return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
        });
        
        if (!stillConnected) {
          throw new Error('Connection lost during unstable network');
        }
        
        // Restore normal network
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0,
        });
        
        console.log('✅ Connection survived unstable network');
      }
    );
  }

  // TEST 5: Reconnect sau disconnect
  async testReconnectAfterDisconnect() {
    await this.runTest(
      'Test reconnect sau disconnect',
      'ƯU TIÊN CAO: User rejoin sau khi mất kết nối',
      async () => {
        console.log('[A] Closing page...');
        await this.pageA.close();
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('[A] Reopening page...');
        this.pageA = await this.browserA.newPage();
        await this.pageA.setViewport({ width: 1280, height: 720 });
        this.pageA.on('console', msg => console.log(`[Peer A] ${msg.text()}`));
        
        await this.pageA.evaluateOnNewDocument(() => {
          window.__VIDEOLIFY_TEST_MODE__ = true;
        });
        
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Peer B clicks reconnect
        await this.pageB.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const reconnectBtn = buttons.find(btn => btn.textContent.includes('Kết nối lại') || btn.textContent.includes('reconnect'));
          if (reconnectBtn) reconnectBtn.click();
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await waitForConnection(this.pageA, 'A');
        await waitForConnection(this.pageB, 'B');
        
        console.log('✅ Reconnected successfully');
      }
    );
  }

  // TEST 6: Băng thông giảm đột ngột
  async testBandwidthDrop() {
    await this.runTest(
      'Test băng thông giảm đột ngột',
      'THƯỜNG GẶP: Băng thông giảm xuống 300kbps',
      async () => {
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

  // TEST 7: Đóng tab đột ngột
  async testCloseTab() {
    await this.runTest(
      'Test đóng tab đột ngột',
      'THƯỜNG GẶP: User đóng tab, peer kia phát hiện disconnect',
      async () => {
        console.log('[A] Closing tab suddenly...');
        await this.pageA.close();
        
        console.log('[B] Waiting for disconnect detection...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const disconnectDetected = await this.pageB.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(btn => btn.textContent.includes('Kết nối lại') || btn.textContent.includes('reconnect'));
        });
        
        if (!disconnectDetected) {
          throw new Error('Peer B did not detect disconnect');
        }
        
        console.log('✅ Disconnect detected by peer B');
        
        // Reopen for next tests
        this.pageA = await this.browserA.newPage();
        await this.pageA.setViewport({ width: 1280, height: 720 });
        this.pageA.on('console', msg => console.log(`[Peer A] ${msg.text()}`));
        await this.pageA.evaluateOnNewDocument(() => {
          window.__VIDEOLIFY_TEST_MODE__ = true;
        });
        await this.joinRoom(this.pageA, 'A');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    );
  }

  // TEST 8: Server Restart
  async testServerRestart() {
    await this.runTest(
      'Test server restart',
      'ƯU TIÊN CAO: P2P call tiếp tục khi server restart',
      async () => {
        console.log('[Test] Simulating server restart (blocking SSE)...');
        
        const beforeRestart = await this.pageA.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                             document.querySelector('video:not([data-testid="local-video"])');
          return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
        });
        
        if (!beforeRestart) {
          throw new Error('Not connected before server restart');
        }
        
        // Block SSE endpoint
        await this.pageA.setRequestInterception(true);
        await this.pageB.setRequestInterception(true);
        
        this.pageA.on('request', request => {
          if (request.url().includes('/api/videolify/signal')) {
            request.abort();
          } else {
            request.continue();
          }
        });
        
        this.pageB.on('request', request => {
          if (request.url().includes('/api/videolify/signal')) {
            request.abort();
          } else {
            request.continue();
          }
        });
        
        console.log('[Test] Server "down" for 15 seconds...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const duringRestart = await this.pageA.evaluate(() => {
          const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                             document.querySelector('video:not([data-testid="local-video"])');
          return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
        });
        
        if (!duringRestart) {
          throw new Error('P2P connection died during server restart');
        }
        
        // Restore
        await this.pageA.setRequestInterception(false);
        await this.pageB.setRequestInterception(false);
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('✅ P2P survived server restart');
      }
    );
  }

  // TEST 9: Cả 2 bên F5 đồng thời
  async testBothF5() {
    await this.runTest(
      'Test cả 2 bên F5 đồng thời',
      'THƯỜNG GẶP: Race condition khi cả 2 bên refresh',
      async () => {
        console.log('[A & B] Refreshing both pages simultaneously...');
        
        await Promise.all([
          this.pageA.reload({ waitUntil: 'domcontentloaded', timeout: CONFIG.timeout }),
          this.pageB.reload({ waitUntil: 'domcontentloaded', timeout: CONFIG.timeout }),
        ]);
        
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const reconnectedA = await waitFor(async () => {
          return await this.pageA.evaluate(() => {
            const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                               document.querySelector('video:not([data-testid="local-video"])');
            return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
          });
        }, 30000);
        
        const reconnectedB = await waitFor(async () => {
          return await this.pageB.evaluate(() => {
            const remoteVideo = document.querySelector('[data-testid="remote-video"]') || 
                               document.querySelector('video:not([data-testid="local-video"])');
            return remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.active;
          });
        }, 30000);
        
        if (!reconnectedA || !reconnectedB) {
          throw new Error('Failed to reconnect after both F5');
        }
        
        console.log('✅ Both peers reconnected after simultaneous F5');
      }
    );
  }

  // ============================================================================
  // Generate Console Report (No HTML file)
  // ============================================================================

  generateReport() {
    const duration = Date.now() - testResults.startTime.getTime();
    const passRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
    
    // Just log to console - no file creation
    console.log('\n📊 TEST REPORT GENERATED (Console only - no file created)\n');
  }

  // ============================================================================
  // Run All Tests
  // ============================================================================

  async runAll() {
    try {
      await this.setup();
      
      console.log('\n🎯 RUNNING 5 PRIORITY TESTS\n');
      
      // Run ONLY first 5 tests
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
      
      // Print detailed summary
      console.log('\n' + '='.repeat(80));
      console.log('📊 TEST SUMMARY - TOP 5 PRIORITY TESTS');
      console.log('='.repeat(80));
      console.log(`Total: ${testResults.total}`);
      console.log(`Passed: ${testResults.passed} ✅`);
      console.log(`Failed: ${testResults.failed} ❌`);
      console.log(`Pass Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
      console.log('='.repeat(80));
      
      // Print each test result
      testResults.tests.forEach((test, index) => {
        const icon = test.status === 'PASSED' ? '✅' : '❌';
        const time = (test.duration / 1000).toFixed(2);
        console.log(`${icon} Test ${index + 1}: ${test.name} (${time}s)`);
        if (test.error) {
          console.log(`   Error: ${test.error}`);
        }
      });
      console.log('='.repeat(80) + '\n');
      
      process.exit(testResults.failed > 0 ? 1 : 0);
    }
  }
}

// ============================================================================
// Main Execution
// ============================================================================

const runner = new PriorityTestRunner();
runner.runAll();
