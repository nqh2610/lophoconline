/**
 * FULLY AUTOMATED TEST - Connection Join Issue
 * No manual intervention required
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const TEST_ROOM = `autotest-${Date.now()}`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TestRunner {
  constructor() {
    this.browser1 = null;
    this.browser2 = null;
    this.page1 = null;
    this.page2 = null;
    this.logsA = [];
    this.logsB = [];
  }

  async setup() {
    console.log('🔧 Setting up test environment...\n');
    
    // Launch browsers
    this.browser1 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    this.browser2 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    this.page1 = await this.browser1.newPage();
    this.page2 = await this.browser2.newPage();
    
    // Grant permissions
    await this.browser1.defaultBrowserContext().overridePermissions(BASE_URL, ['camera', 'microphone']);
    await this.browser2.defaultBrowserContext().overridePermissions(BASE_URL, ['camera', 'microphone']);
    
    // Collect console logs
    this.page1.on('console', msg => {
      const text = msg.text();
      this.logsA.push(text);
    });
    
    this.page2.on('console', msg => {
      const text = msg.text();
      this.logsB.push(text);
    });
    
    console.log('✅ Browsers ready\n');
  }

  async runTest() {
    console.log(`🧪 TEST: Join mới - 2 peers kết nối\n`);
    console.log(`Room: ${TEST_ROOM}\n`);
    
    // STEP 1: Peer A joins
    console.log('📍 STEP 1: Peer A joining room...');
    await this.page1.goto(`${BASE_URL}/video-call/${TEST_ROOM}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await delay(5000); // Wait for initialization
    console.log('✅ Peer A joined\n');
    
    // STEP 2: Peer B joins
    console.log('📍 STEP 2: Peer B joining room...');
    await this.page2.goto(`${BASE_URL}/video-call/${TEST_ROOM}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await delay(3000); // Wait for peer-joined event
    console.log('✅ Peer B joined\n');
    
    // STEP 3: Wait for connection
    console.log('📍 STEP 3: Waiting for P2P connection (15s max)...\n');
    
    const connected = await this.waitForConnection(15000);
    
    if (connected) {
      console.log('✅ CONNECTION ESTABLISHED!\n');
      return true;
    } else {
      console.log('❌ CONNECTION FAILED\n');
      await this.diagnose();
      return false;
    }
  }

  async waitForConnection(timeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const [stateA, stateB] = await Promise.all([
        this.page1.evaluate(() => {
          const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
          return {
            hasPC: !!pc,
            state: pc?.connectionState,
            iceState: pc?.iceConnectionState,
          };
        }),
        this.page2.evaluate(() => {
          const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
          return {
            hasPC: !!pc,
            state: pc?.connectionState,
            iceState: pc?.iceConnectionState,
          };
        })
      ]);
      
      // Print progress every 2s
      if ((Date.now() - startTime) % 2000 < 100) {
        console.log(`  [A] ${stateA.state || 'no-pc'} / ${stateA.iceState || 'no-ice'}`);
        console.log(`  [B] ${stateB.state || 'no-pc'} / ${stateB.iceState || 'no-ice'}\n`);
      }
      
      if (stateA.state === 'connected' && stateB.state === 'connected') {
        return true;
      }
      
      if (stateA.state === 'failed' || stateB.state === 'failed') {
        console.log('⚠️  Connection failed state detected\n');
        return false;
      }
      
      await delay(500);
    }
    
    return false;
  }

  async diagnose() {
    console.log('🔍 DIAGNOSING ISSUE...\n');
    
    // Get final states
    const [stateA, stateB, debugA, debugB] = await Promise.all([
      this.page1.evaluate(() => {
        const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
        return {
          hasPC: !!pc,
          connectionState: pc?.connectionState,
          iceConnectionState: pc?.iceConnectionState,
          signalingState: pc?.signalingState,
        };
      }),
      this.page2.evaluate(() => {
        const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
        return {
          hasPC: !!pc,
          connectionState: pc?.connectionState,
          iceConnectionState: pc?.iceConnectionState,
          signalingState: pc?.signalingState,
        };
      }),
      this.page1.evaluate(() => ({
        localPeerId: window.peerIdRef?.current,
        remotePeerId: window.remotePeerIdRef?.current,
        hasJoined: window.hasJoinedRef?.current,
        sseState: window.eventSource?.readyState,
      })),
      this.page2.evaluate(() => ({
        localPeerId: window.peerIdRef?.current,
        remotePeerId: window.remotePeerIdRef?.current,
        hasJoined: window.hasJoinedRef?.current,
        sseState: window.eventSource?.readyState,
      }))
    ]);
    
    console.log('📊 Final States:');
    console.log('  Peer A:', JSON.stringify(stateA, null, 2));
    console.log('  Peer B:', JSON.stringify(stateB, null, 2));
    console.log('\n  Debug A:', JSON.stringify(debugA, null, 2));
    console.log('  Debug B:', JSON.stringify(debugB, null, 2));
    console.log();
    
    // Analyze logs
    const analysis = this.analyzeLogs();
    
    console.log('📝 Log Analysis:');
    console.log('  SSE Connected:', analysis.sseConnected);
    console.log('  Joined Room:', analysis.joined);
    console.log('  Peer Joined Event:', analysis.peerJoined);
    console.log('  shouldInitiate:', analysis.shouldInitiate);
    console.log('  Offer Created:', analysis.offerCreated);
    console.log('  Offer Received:', analysis.offerReceived);
    console.log('  Answer Created:', analysis.answerCreated);
    console.log('  Answer Received:', analysis.answerReceived);
    console.log();
    
    // Determine root cause
    console.log('🎯 ROOT CAUSE:');
    
    if (!analysis.sseConnected.A || !analysis.sseConnected.B) {
      console.log('❌ SSE connection issue');
      console.log('   One or both peers failed to establish SSE');
    }
    
    if (!analysis.peerJoined.A && !analysis.peerJoined.B) {
      console.log('❌ peer-joined event not broadcast');
      console.log('   Server did not send peer-joined to either peer');
      console.log('   → Check server signal API');
    } else if (!analysis.peerJoined.A) {
      console.log('❌ Peer A did not receive peer-joined');
      console.log('   → SSE timing issue or broadcast failed');
    } else if (!analysis.peerJoined.B) {
      console.log('❌ Peer B did not receive peer-joined');
      console.log('   → SSE timing issue or broadcast failed');
    }
    
    if (!analysis.shouldInitiate.A && !analysis.shouldInitiate.B) {
      console.log('⚠️  Neither peer received shouldInitiate flag');
      console.log('   → Check server response and broadcast data');
    }
    
    if (!analysis.offerCreated.A && !analysis.offerCreated.B) {
      console.log('❌ No offer created by either peer');
      console.log('   → shouldInitiate logic failed');
      console.log('   → Both peers waiting for other to create offer (deadlock)');
    }
    
    if ((analysis.offerCreated.A || analysis.offerCreated.B) && 
        !analysis.offerReceived.A && !analysis.offerReceived.B) {
      console.log('❌ Offer created but not received');
      console.log('   → Server SSE broadcast failed');
      console.log('   → Check offer event handler');
    }
    
    if ((analysis.offerReceived.A || analysis.offerReceived.B) && 
        !analysis.answerCreated.A && !analysis.answerCreated.B) {
      console.log('❌ Offer received but no answer created');
      console.log('   → Answer creation failed');
      console.log('   → Check createAnswer() errors');
    }
    
    if ((analysis.answerCreated.A || analysis.answerCreated.B) && 
        !analysis.answerReceived.A && !analysis.answerReceived.B) {
      console.log('❌ Answer created but not received');
      console.log('   → Server SSE broadcast failed');
    }
    
    // Print relevant log excerpts
    console.log('\n📄 Relevant Logs:\n');
    
    console.log('[Peer A] Key events:');
    this.printRelevantLogs(this.logsA, '  ');
    
    console.log('\n[Peer B] Key events:');
    this.printRelevantLogs(this.logsB, '  ');
  }

  analyzeLogs() {
    return {
      sseConnected: {
        A: this.logsA.some(l => l.includes('SSE connection opened')),
        B: this.logsB.some(l => l.includes('SSE connection opened'))
      },
      joined: {
        A: this.logsA.some(l => l.includes('Joined room successfully')),
        B: this.logsB.some(l => l.includes('Joined room successfully'))
      },
      peerJoined: {
        A: this.logsA.some(l => l.includes('Peer joined event')),
        B: this.logsB.some(l => l.includes('Peer joined event'))
      },
      shouldInitiate: {
        A: this.logsA.some(l => l.includes('shouldInitiate')),
        B: this.logsB.some(l => l.includes('shouldInitiate'))
      },
      offerCreated: {
        A: this.logsA.some(l => l.includes('Creating offer')),
        B: this.logsB.some(l => l.includes('Creating offer'))
      },
      offerReceived: {
        A: this.logsA.some(l => l.includes('Received offer')),
        B: this.logsB.some(l => l.includes('Received offer'))
      },
      answerCreated: {
        A: this.logsA.some(l => l.includes('Creating answer')),
        B: this.logsB.some(l => l.includes('Creating answer'))
      },
      answerReceived: {
        A: this.logsA.some(l => l.includes('Received answer')),
        B: this.logsB.some(l => l.includes('Received answer'))
      }
    };
  }

  printRelevantLogs(logs, prefix = '') {
    const keywords = [
      'SSE connection opened',
      'Joined room',
      'Peer joined',
      'shouldInitiate',
      'Creating offer',
      'Received offer',
      'Creating answer',
      'Received answer',
      'connectionState',
      'iceConnectionState',
      'failed',
      'ERROR',
      'Error'
    ];
    
    let printed = 0;
    for (const log of logs) {
      if (keywords.some(k => log.includes(k))) {
        console.log(prefix + log);
        printed++;
        if (printed >= 20) { // Limit output
          console.log(prefix + '... (truncated)');
          break;
        }
      }
    }
    
    if (printed === 0) {
      console.log(prefix + '(no relevant logs found)');
    }
  }

  async cleanup() {
    console.log('\n⏸️  Keeping browsers open for 10 seconds for manual inspection...');
    await delay(10000);
    
    console.log('🧹 Closing browsers...');
    if (this.browser1) await this.browser1.close();
    if (this.browser2) await this.browser2.close();
  }
}

// Main
async function main() {
  const runner = new TestRunner();
  
  try {
    await runner.setup();
    const success = await runner.runTest();
    
    console.log('\n' + '='.repeat(60));
    console.log(success ? '✅ TEST PASSED' : '❌ TEST FAILED');
    console.log('='.repeat(60) + '\n');
    
    await runner.cleanup();
    
    process.exit(success ? 0 : 1);
    
  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error(err.stack);
    await runner.cleanup();
    process.exit(1);
  }
}

main();
