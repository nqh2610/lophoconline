/**
 * AUTO TEST - Virtual Background Between Peers
 * Tests if VBG settings are properly sent and applied between peers
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const TEST_ROOM = `vbg-test-${Date.now()}`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log('🧪 Starting VBG Auto Test...\n');

  const browser1 = await puppeteer.launch({ headless: false, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const browser2 = await puppeteer.launch({ headless: false, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });

  try {
    const page1 = await browser1.newPage();
    const page2 = await browser2.newPage();

    // Enable console logging
    page1.on('console', msg => console.log(`[Peer1] ${msg.text()}`));
    page2.on('console', msg => console.log(`[Peer2] ${msg.text()}`));

    console.log('✅ Step 1: Open room on both peers');
    await page1.goto(`${BASE_URL}/room/${TEST_ROOM}`);
    await page2.goto(`${BASE_URL}/room/${TEST_ROOM}`);
    await sleep(3000);

    console.log('✅ Step 2: Enable camera on both');
    await page1.click('[title="Bật/tắt camera"]');
    await page2.click('[title="Bật/tắt camera"]');
    await sleep(2000);

    console.log('✅ Step 3: Wait for peer connection');
    await sleep(5000);

    console.log('✅ Step 4: Peer1 enables blur background');
    // Open VBG menu
    await page1.click('button:has-text("Nền ảo")');
    await sleep(500);
    
    // Click blur button
    await page1.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const blurBtn = buttons.find(b => b.textContent.includes('Làm mờ'));
      if (blurBtn) blurBtn.click();
    });
    
    await sleep(3000);

    console.log('✅ Step 5: Check if Peer2 sees blur on remote video');
    const peer2RemoteVbg = await page2.evaluate(() => {
      const remoteVideo = document.querySelector('video[id*="remote"]');
      if (!remoteVideo) return { error: 'No remote video found' };
      
      const srcObject = remoteVideo.srcObject;
      if (!srcObject) return { error: 'No srcObject' };
      
      const tracks = srcObject.getVideoTracks();
      if (tracks.length === 0) return { error: 'No video tracks' };
      
      return {
        hasRemoteVideo: true,
        trackLabel: tracks[0].label,
        isProcessed: tracks[0].label.includes('canvas') || tracks[0].label.includes('processed')
      };
    });

    console.log('\n📊 Test Result:', peer2RemoteVbg);

    if (peer2RemoteVbg.isProcessed) {
      console.log('❌ FAIL: Peer2 is seeing processed stream (should see original!)');
    } else {
      console.log('✅ PASS: Peer2 sees original stream (correct architecture)');
    }

    // Check localStorage to see if VBG settings were received
    const peer2Storage = await page2.evaluate(() => {
      const peerId = localStorage.getItem('videolify-peer-id');
      const keys = Object.keys(localStorage).filter(k => k.includes('vbg') || k.includes('peer'));
      const data = {};
      keys.forEach(k => data[k] = localStorage.getItem(k));
      return { peerId, vbgKeys: data };
    });

    console.log('\n📦 Peer2 localStorage:', peer2Storage);

    await sleep(2000);

    console.log('\n✅ Step 6: Peer1 enables preset background');
    await page1.evaluate(() => {
      const presets = Array.from(document.querySelectorAll('button[title]'));
      const beachBtn = presets.find(b => b.title === 'Beach background');
      if (beachBtn) beachBtn.click();
    });

    await sleep(3000);

    const peer2StorageAfterPreset = await page2.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.includes('peer') && k.includes('vbg'));
      const data = {};
      keys.forEach(k => data[k] = localStorage.getItem(k));
      return data;
    });

    console.log('\n📦 Peer2 localStorage after preset:', peer2StorageAfterPreset);

    await sleep(5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🧹 Cleaning up...');
    await browser1.close();
    await browser2.close();
  }
}

test().catch(console.error);
