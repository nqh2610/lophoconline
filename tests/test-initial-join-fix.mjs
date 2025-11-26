/**
 * Test Initial Join Connection Fix
 * Verify that initial connection works as reliably as F5 refresh
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:3000/test-videolify';
const ROOM_ID = `test-room-${Date.now()}`;

console.log('🧪 Testing Initial Join Connection Fix');
console.log(`📍 Room ID: ${ROOM_ID}`);
console.log('─'.repeat(80));

async function main() {
  let browserA, browserB;

  try {
    // Launch browsers in parallel
    console.log('🚀 Launching browsers...');
    [browserA, browserB] = await Promise.all([
      puppeteer.launch({
        headless: false,
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
      }),
      puppeteer.launch({
        headless: false,
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
      })
    ]);

    const pageA = await browserA.newPage();
    const pageB = await browserB.newPage();

    // Enable console logging
    pageA.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') || text.includes('peer') || text.includes('Role')) {
        console.log(`[Peer A] ${text}`);
      }
    });

    pageB.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') || text.includes('peer') || text.includes('Role')) {
        console.log(`[Peer B] ${text}`);
      }
    });

    console.log('\n✅ Browsers launched\n');

    // STEP 1: Peer A joins first
    console.log('👤 STEP 1: Peer A joining room...');
    await pageA.goto(`${TEST_URL}?room=${ROOM_ID}&name=Peer-A&role=tutor`, {
      waitUntil: 'networkidle2'
    });

    console.log('⏳ Waiting 3s for Peer A to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get Peer A's peer ID
    const peerAId = await pageA.evaluate(() => {
      return window.__VIDEOLIFY_DEBUG__?.peerConnection ?
        Object.keys(sessionStorage).find(k => k.startsWith('videolify-peer-'))?.split('-').slice(2).join('-') :
        null;
    });
    console.log(`✅ Peer A initialized with ID: ${peerAId || 'unknown'}`);

    // STEP 2: Peer B joins (NEW PEER - INITIAL JOIN)
    console.log('\n👤 STEP 2: Peer B joining room (INITIAL JOIN)...');
    await pageB.goto(`${TEST_URL}?room=${ROOM_ID}&name=Peer-B&role=student`, {
      waitUntil: 'networkidle2'
    });

    console.log('⏳ Waiting 5s for connection establishment...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get Peer B's peer ID
    const peerBId = await pageB.evaluate(() => {
      return Object.keys(sessionStorage).find(k => k.startsWith('videolify-peer-'))?.split('-').slice(2).join('-') || null;
    });
    console.log(`✅ Peer B initialized with ID: ${peerBId || 'unknown'}`);

    // STEP 3: Check connection states
    console.log('\n📊 STEP 3: Checking connection states...');

    const [stateA, stateB] = await Promise.all([
      pageA.evaluate(() => {
        const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
        return {
          connectionState: pc?.connectionState,
          iceConnectionState: pc?.iceConnectionState,
          signalingState: pc?.signalingState,
          hasRemoteStream: !!window.__VIDEOLIFY_DEBUG__?.remoteStream,
        };
      }),
      pageB.evaluate(() => {
        const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
        return {
          connectionState: pc?.connectionState,
          iceConnectionState: pc?.iceConnectionState,
          signalingState: pc?.signalingState,
          hasRemoteStream: !!window.__VIDEOLIFY_DEBUG__?.remoteStream,
        };
      })
    ]);

    console.log('\nPeer A State:', stateA);
    console.log('Peer B State:', stateB);

    // STEP 4: Verify connection success
    console.log('\n🎯 STEP 4: Verifying connection...');

    const isConnected =
      stateA.connectionState === 'connected' &&
      stateB.connectionState === 'connected' &&
      stateA.hasRemoteStream &&
      stateB.hasRemoteStream;

    if (isConnected) {
      console.log('\n✅ ✅ ✅ SUCCESS! Initial join connection works!');
      console.log('✅ Both peers connected');
      console.log('✅ Remote streams flowing');
      console.log('\n🎉 Fix verified - initial join now works like F5!');
    } else {
      console.log('\n❌ ❌ ❌ FAILED! Connection not established');
      console.log('❌ Peer A connection:', stateA.connectionState);
      console.log('❌ Peer B connection:', stateB.connectionState);

      // Try to get more debug info
      const debugA = await pageA.evaluate(() => {
        return {
          peerId: Object.keys(sessionStorage).find(k => k.startsWith('videolify-peer-')),
          remotePeerId: window.__VIDEOLIFY_DEBUG__?.remotePeerId,
          role: window.__VIDEOLIFY_DEBUG__?.isPolitePeer !== undefined ?
            (window.__VIDEOLIFY_DEBUG__.isPolitePeer ? 'POLITE' : 'IMPOLITE') : 'unknown'
        };
      });
      const debugB = await pageB.evaluate(() => {
        return {
          peerId: Object.keys(sessionStorage).find(k => k.startsWith('videolify-peer-')),
          remotePeerId: window.__VIDEOLIFY_DEBUG__?.remotePeerId,
          role: window.__VIDEOLIFY_DEBUG__?.isPolitePeer !== undefined ?
            (window.__VIDEOLIFY_DEBUG__.isPolitePeer ? 'POLITE' : 'IMPOLITE') : 'unknown'
        };
      });

      console.log('\nDebug Info:');
      console.log('Peer A:', debugA);
      console.log('Peer B:', debugB);
    }

    console.log('\n⏳ Keeping browsers open for 30s for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('\n❌ Test error:', error);
  } finally {
    console.log('\n🧹 Cleaning up...');
    if (browserA) await browserA.close();
    if (browserB) await browserB.close();
    console.log('✅ Test completed');
  }
}

main();
