/**
 * SIMPLE DEBUG TEST: Check console logs để tìm vấn đề join
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const TEST_ROOM = `test-${Date.now()}`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  let browser1, browser2;
  
  try {
    console.log('🚀 Starting test...\n');
    console.log('Room:', TEST_ROOM);
    console.log('URL:', `${BASE_URL}/video-call/${TEST_ROOM}\n`);
    
    // Browser 1 - Peer A
    browser1 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox'
      ]
    });
    
    const page1 = await browser1.newPage();
    const context1 = browser1.defaultBrowserContext();
    await context1.overridePermissions(BASE_URL, ['camera', 'microphone']);
    
    const logsA = [];
    page1.on('console', msg => {
      const text = msg.text();
      logsA.push(text);
      if (text.includes('[Videolify]') || text.includes('SSE') || text.includes('shouldInitiate') || text.includes('offer')) {
        console.log(`[A] ${text}`);
      }
    });
    
    // Browser 2 - Peer B
    browser2 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox'
      ]
    });
    
    const page2 = await browser2.newPage();
    const context2 = browser2.defaultBrowserContext();
    await context2.overridePermissions(BASE_URL, ['camera', 'microphone']);
    
    const logsB = [];
    page2.on('console', msg => {
      const text = msg.text();
      logsB.push(text);
      if (text.includes('[Videolify]') || text.includes('SSE') || text.includes('shouldInitiate') || text.includes('offer')) {
        console.log(`[B] ${text}`);
      }
    });
    
    // Peer A join
    console.log('\n📍 Peer A joining...\n');
    await page1.goto(`${BASE_URL}/video-call/${TEST_ROOM}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await delay(5000); // Wait for init
    
    // Peer B join
    console.log('\n📍 Peer B joining...\n');
    await page2.goto(`${BASE_URL}/video-call/${TEST_ROOM}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await delay(10000); // Wait for connection
    
    // Check states
    console.log('\n📊 Checking connection states...\n');
    
    const stateA = await page1.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      return {
        hasPC: !!pc,
        connectionState: pc?.connectionState,
        iceState: pc?.iceConnectionState,
        localPeerId: window.peerIdRef?.current,
        remotePeerId: window.remotePeerIdRef?.current,
        sseState: window.eventSource?.readyState,
      };
    });
    
    const stateB = await page2.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      return {
        hasPC: !!pc,
        connectionState: pc?.connectionState,
        iceState: pc?.iceConnectionState,
        localPeerId: window.peerIdRef?.current,
        remotePeerId: window.remotePeerIdRef?.current,
        sseState: window.eventSource?.readyState,
      };
    });
    
    console.log('[A] State:', stateA);
    console.log('[B] State:', stateB);
    
    // Check logs for key events
    console.log('\n📝 Analyzing logs...\n');
    
    const hasSSEConnectedA = logsA.some(l => l.includes('SSE connection opened'));
    const hasSSEConnectedB = logsB.some(l => l.includes('SSE connection opened'));
    const hasJoinedA = logsA.some(l => l.includes('Joined room successfully'));
    const hasJoinedB = logsB.some(l => l.includes('Joined room successfully'));
    const hasPeerJoinedA = logsA.some(l => l.includes('Peer joined event'));
    const hasPeerJoinedB = logsB.some(l => l.includes('Peer joined event'));
    const hasOfferA = logsA.some(l => l.includes('Creating offer') || l.includes('Received offer'));
    const hasOfferB = logsB.some(l => l.includes('Creating offer') || l.includes('Received offer'));
    const hasAnswerA = logsA.some(l => l.includes('Creating answer') || l.includes('Received answer'));
    const hasAnswerB = logsB.some(l => l.includes('Creating answer') || l.includes('Received answer'));
    
    console.log('SSE Connected:', { A: hasSSEConnectedA, B: hasSSEConnectedB });
    console.log('Joined Room:', { A: hasJoinedA, B: hasJoinedB });
    console.log('Peer Joined Event:', { A: hasPeerJoinedA, B: hasPeerJoinedB });
    console.log('Offer:', { A: hasOfferA, B: hasOfferB });
    console.log('Answer:', { A: hasAnswerA, B: hasAnswerB });
    
    // Results
    console.log('\n📊 RESULTS:\n');
    
    if (stateA.connectionState === 'connected' && stateB.connectionState === 'connected') {
      console.log('✅ TEST PASSED - Both connected!');
    } else {
      console.log('❌ TEST FAILED - Not connected');
      
      console.log('\n🔍 DIAGNOSIS:');
      
      if (!hasSSEConnectedA || !hasSSEConnectedB) {
        console.log('❌ SSE not connected properly');
      }
      
      if (!hasPeerJoinedA && !hasPeerJoinedB) {
        console.log('❌ peer-joined event NOT received by either peer');
        console.log('   → Check server SSE broadcast');
      } else if (!hasPeerJoinedA) {
        console.log('❌ Peer A did NOT receive peer-joined event');
      } else if (!hasPeerJoinedB) {
        console.log('❌ Peer B did NOT receive peer-joined event');
      }
      
      if (!hasOfferA && !hasOfferB) {
        console.log('❌ No peer created offer');
        console.log('   → Check shouldInitiate logic');
      }
      
      if (!hasAnswerA && !hasAnswerB) {
        console.log('❌ No answer created');
        console.log('   → Offer might not be received');
      }
    }
    
    // Keep open
    console.log('\n⏸️  Keeping browsers open for 60s...');
    await delay(60000);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    console.log('🧹 Cleaning up...');
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
  }
}

test().catch(console.error);
