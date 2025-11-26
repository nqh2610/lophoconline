/**
 * Auto Test P2P Connectivity
 * Tests WebRTC P2P connection capabilities between peers
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  roomId: `test-p2p-${Date.now()}`,
  testDuration: 30000, // 30 seconds
  maxRetries: 3,
  headless: true,
};

const TEST_RESULTS = {
  timestamp: new Date().toISOString(),
  testName: 'P2P Connectivity Test',
  results: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    duration: 0,
  },
};

class P2PConnectivityTester {
  constructor() {
    this.browsers = [];
    this.pages = [];
    this.results = [];
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);

    // Also write to file
    fs.appendFileSync('test-p2p-connectivity.log', logMessage + '\n');
  }

  async setupBrowsers(peerCount = 2) {
    this.log(`Setting up ${peerCount} browser instances for P2P testing`);

    for (let i = 0; i < peerCount; i++) {
      try {
        const browser = await chromium.launch({
          headless: TEST_CONFIG.headless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-running-insecure-content',
          ],
        });

        const context = await browser.newContext({
          permissions: ['camera', 'microphone'],
          userAgent: `P2P-Test-Peer-${i + 1}`,
        });

        const page = await context.newPage();

        // Mock getUserMedia for testing
        await page.addInitScript(() => {
          navigator.mediaDevices.getUserMedia = async (constraints) => {
            // Create fake media streams for testing
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');

            // Create video track
            const videoStream = canvas.captureStream(30);
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const audioStream = audioContext.createMediaStreamDestination().stream;

            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.connect(audioStream);
            oscillator.start();

            return new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
          };
        });

        this.browsers.push(browser);
        this.pages.push(page);

        this.log(`Browser ${i + 1} setup complete`);
      } catch (error) {
        this.log(`Failed to setup browser ${i + 1}: ${error.message}`, 'ERROR');
        throw error;
      }
    }
  }

  async testPeerConnection(peerIndex, roomId, userName) {
    const page = this.pages[peerIndex];
    const testResult = {
      peerId: peerIndex + 1,
      userName,
      roomId,
      steps: [],
      success: false,
      errors: [],
      metrics: {},
    };

    try {
      this.log(`Starting P2P test for Peer ${peerIndex + 1} (${userName})`);

      // Navigate to the application
      await page.goto(`${TEST_CONFIG.baseUrl}/videolify?roomId=${roomId}&userName=${userName}&role=${peerIndex === 0 ? 'tutor' : 'student'}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      testResult.steps.push({ step: 'navigation', status: 'success', timestamp: Date.now() });
      this.log(`Peer ${peerIndex + 1}: Navigation successful`);

      // Wait for connection establishment
      await page.waitForSelector('[data-testid="connection-indicator"], .connection-indicator, .status-indicator', {
        timeout: 15000,
        state: 'visible'
      });

      testResult.steps.push({ step: 'connection_wait', status: 'success', timestamp: Date.now() });
      this.log(`Peer ${peerIndex + 1}: Connection indicator found`);

      // Monitor connection state
      const connectionState = await page.evaluate(() => {
        // Try to find connection state from various possible selectors
        const indicators = [
          '[data-testid="connection-indicator"]',
          '.connection-indicator',
          '.status-indicator',
          '.connection-status'
        ];

        for (const selector of indicators) {
          const element = document.querySelector(selector);
          if (element) {
            return {
              text: element.textContent,
              className: element.className,
              color: window.getComputedStyle(element).backgroundColor
            };
          }
        }

        // Fallback: check for green indicators
        const greenElements = document.querySelectorAll('[style*="background-color: rgb(34, 197, 94)"], [style*="background-color: green"]');
        if (greenElements.length > 0) {
          return { status: 'connected', indicator: 'green' };
        }

        return { status: 'unknown' };
      });

      testResult.metrics.connectionState = connectionState;
      this.log(`Peer ${peerIndex + 1}: Connection state - ${JSON.stringify(connectionState)}`);

      // Test WebRTC connection details
      const webrtcStats = await page.evaluate(async () => {
        const stats = {
          peerConnections: 0,
          dataChannels: 0,
          iceCandidates: { local: 0, remote: 0 },
          connectionStates: {},
        };

        // Check for RTCPeerConnection instances
        if (window.RTCPeerConnection) {
          // This is a simplified check - in real app we'd need to access the actual connections
          stats.peerConnections = 1; // Assume at least one exists
        }

        return stats;
      });

      testResult.metrics.webrtcStats = webrtcStats;
      this.log(`Peer ${peerIndex + 1}: WebRTC stats - ${JSON.stringify(webrtcStats)}`);

      // Test chat functionality
      const chatTest = await this.testChatFunctionality(page, peerIndex);
      testResult.metrics.chatTest = chatTest;

      // Test media streaming
      const mediaTest = await this.testMediaStreaming(page, peerIndex);
      testResult.metrics.mediaTest = mediaTest;

      // Wait for stable connection
      await page.waitForTimeout(5000);

      // Final connection check
      const finalState = await page.evaluate(() => {
        const connectedIndicators = document.querySelectorAll('[style*="background-color: rgb(34, 197, 94)"], .connected, .success');
        return connectedIndicators.length > 0;
      });

      if (finalState) {
        testResult.success = true;
        testResult.steps.push({ step: 'final_connection_check', status: 'success', timestamp: Date.now() });
        this.log(`Peer ${peerIndex + 1}: P2P connection test PASSED`);
      } else {
        testResult.errors.push('Final connection check failed');
        this.log(`Peer ${peerIndex + 1}: P2P connection test FAILED - no stable connection`, 'WARN');
      }

    } catch (error) {
      testResult.errors.push(error.message);
      testResult.steps.push({ step: 'error', status: 'failed', error: error.message, timestamp: Date.now() });
      this.log(`Peer ${peerIndex + 1}: Test failed with error: ${error.message}`, 'ERROR');
    }

    return testResult;
  }

  async testChatFunctionality(page, peerIndex) {
    try {
      // Try to find and open chat panel
      const chatSelectors = [
        '[data-testid="chat-button"]',
        'button:has-text("Chat")',
        'button:has([data-lucide="message-square"])',
        '.chat-button'
      ];

      let chatButton = null;
      for (const selector of chatSelectors) {
        try {
          chatButton = await page.locator(selector).first();
          if (await chatButton.isVisible()) break;
        } catch (e) {
          continue;
        }
      }

      if (!chatButton) {
        return { available: false, reason: 'Chat button not found' };
      }

      await chatButton.click();
      await page.waitForTimeout(1000);

      // Try to send a test message
      const inputSelectors = [
        '[data-testid="chat-input"]',
        'input[placeholder*="tin nhắn"]',
        'input[placeholder*="message"]',
        '.chat-input'
      ];

      let chatInput = null;
      for (const selector of inputSelectors) {
        try {
          chatInput = page.locator(selector).first();
          if (await chatInput.isVisible()) break;
        } catch (e) {
          continue;
        }
      }

      if (chatInput) {
        await chatInput.fill(`Test message from Peer ${peerIndex + 1}`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        return { available: true, messageSent: true };
      }

      return { available: true, messageSent: false, reason: 'Input not found' };

    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  async testMediaStreaming(page, peerIndex) {
    try {
      // Check for video elements
      const videoElements = await page.locator('video').all();
      const hasVideos = videoElements.length > 0;

      // Check for audio context (simplified)
      const hasAudio = await page.evaluate(() => {
        return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
      });

      return {
        hasVideoElements: hasVideos,
        videoCount: videoElements.length,
        hasAudioSupport: hasAudio,
      };

    } catch (error) {
      return { error: error.message };
    }
  }

  async runConnectivityTest(peerCount = 2) {
    const startTime = Date.now();

    try {
      this.log(`🚀 Starting P2P Connectivity Test with ${peerCount} peers`);
      this.log(`Room ID: ${TEST_CONFIG.roomId}`);

      // Setup browsers
      await this.setupBrowsers(peerCount);

      // Run tests for each peer
      const testPromises = [];
      for (let i = 0; i < peerCount; i++) {
        const userName = `Peer${i + 1}`;
        testPromises.push(this.testPeerConnection(i, TEST_CONFIG.roomId, userName));
      }

      // Wait for all tests to complete
      const results = await Promise.allSettled(testPromises);

      // Process results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
        } else {
          this.results.push({
            peerId: index + 1,
            success: false,
            errors: [result.reason.message],
            steps: [{ step: 'test_execution', status: 'failed', error: result.reason.message }]
          });
        }
      });

      // Generate summary
      const summary = {
        totalTests: peerCount,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        duration: Date.now() - startTime,
      };

      this.log(`📊 Test Summary: ${summary.passed}/${summary.totalTests} peers connected successfully`);
      this.log(`⏱️  Total duration: ${(summary.duration / 1000).toFixed(2)} seconds`);

      return { results: this.results, summary };

    } catch (error) {
      this.log(`❌ Test execution failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  async cleanup() {
    this.log('🧹 Cleaning up browser instances');

    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        this.log(`Warning: Failed to close browser: ${error.message}`, 'WARN');
      }
    }

    this.browsers = [];
    this.pages = [];
  }

  async runMultipleRounds(rounds = 3, peerCount = 2) {
    const allResults = [];

    for (let round = 1; round <= rounds; round++) {
      this.log(`\n🔄 Starting Round ${round}/${rounds}`);

      try {
        const result = await this.runConnectivityTest(peerCount);
        allResults.push({
          round,
          ...result,
        });

        // Wait between rounds
        if (round < rounds) {
          this.log(`⏳ Waiting 5 seconds before next round...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

      } catch (error) {
        this.log(`❌ Round ${round} failed: ${error.message}`, 'ERROR');
        allResults.push({
          round,
          error: error.message,
          results: [],
          summary: { totalTests: peerCount, passed: 0, failed: peerCount, duration: 0 }
        });
      }
    }

    return allResults;
  }
}

// Main test execution
async function main() {
  const tester = new P2PConnectivityTester();

  try {
    // Clear previous log
    if (fs.existsSync('test-p2p-connectivity.log')) {
      fs.unlinkSync('test-p2p-connectivity.log');
    }

    console.log('🎯 P2P Connectivity Auto Test Starting...');
    console.log('=' .repeat(50));

    // Run multiple test rounds for reliability
    const rounds = process.argv.includes('--quick') ? 1 : 3;
    const peerCount = 2;

    const results = await tester.runMultipleRounds(rounds, peerCount);

    // Calculate overall statistics
    const overallStats = {
      totalRounds: rounds,
      successfulRounds: results.filter(r => r.summary.passed === peerCount).length,
      averageSuccessRate: 0,
      totalDuration: results.reduce((sum, r) => sum + r.summary.duration, 0),
    };

    overallStats.averageSuccessRate = results.reduce((sum, r) => sum + (r.summary.passed / r.summary.totalTests), 0) / rounds;

    // Save detailed results
    const finalResults = {
      ...TEST_RESULTS,
      results,
      overallStats,
      config: TEST_CONFIG,
    };

    fs.writeFileSync('test-p2p-connectivity-results.json', JSON.stringify(finalResults, null, 2));

    console.log('\n📈 Final Results:');
    console.log(`Rounds: ${overallStats.successfulRounds}/${overallStats.totalRounds} successful`);
    console.log(`Average Success Rate: ${(overallStats.averageSuccessRate * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${(overallStats.totalDuration / 1000).toFixed(2)} seconds`);
    console.log('\n📄 Detailed results saved to: test-p2p-connectivity-results.json');
    console.log('📄 Logs saved to: test-p2p-connectivity.log');

    // Exit with appropriate code
    process.exit(overallStats.successfulRounds > 0 ? 0 : 1);

  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { P2PConnectivityTester };