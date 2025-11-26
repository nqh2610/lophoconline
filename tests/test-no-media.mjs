import puppeteer from 'puppeteer';

console.log('🎬 Test: 2 Chrome tabs - One with camera OFF');
console.log('=============================================\n');

const ROOM_ID = 'test-no-media-' + Date.now();
let browser, page1, page2;

try {
  browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  // User 1: WITH camera/mic
  page1 = await browser.newPage();
  page1.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Videolify]') || text.includes('Error')) {
      console.log('[User1]', text.substring(0, 150));
    }
  });

  // User 2: WITHOUT camera/mic  
  page2 = await browser.newPage();
  page2.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Videolify]') || text.includes('Error')) {
      console.log('[User2]', text.substring(0, 150));
    }
  });

  console.log('📝 User 1 joining WITH camera/mic...');
  await page1.goto(`http://localhost:3000/test-videolify?room=${ROOM_ID}&name=UserWithCamera&role=tutor`);
  await new Promise(r => setTimeout(r, 3000));

  const tracks1 = await page1.evaluate(() => {
    return window.localStreamRef?.current?.getTracks().length || 0;
  });
  console.log(`✅ User 1 has ${tracks1} local tracks\n`);

  console.log('📝 User 2 joining WITHOUT camera/mic (simulating disabled)...');
  await page2.goto(`http://localhost:3000/test-videolify?room=${ROOM_ID}&name=UserNoCamera&role=student`);
  await new Promise(r => setTimeout(r, 2000));

  // Simulate disabling camera/mic by stopping all tracks
  await page2.evaluate(() => {
    if (window.localStreamRef?.current) {
      const tracks = window.localStreamRef.current.getTracks();
      console.log(`[Videolify] Stopping ${tracks.length} local tracks to simulate disabled camera/mic`);
      tracks.forEach(track => {
        console.log(`[Videolify] Stopping track: ${track.kind}`);
        track.stop();
      });
    }
  });

  const tracks2 = await page2.evaluate(() => {
    return window.localStreamRef?.current?.getTracks().filter(t => t.readyState === 'live').length || 0;
  });
  console.log(`✅ User 2 has ${tracks2} active tracks (should be 0)\n`);

  console.log('⏳ Waiting 20 seconds for connection...\n');
  
  for (let i = 1; i <= 4; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    const status1 = await page1.evaluate(() => {
      const pc = window.peerConnectionRef?.current;
      return {
        connected: pc?.connectionState === 'connected',
        iceState: pc?.iceConnectionState,
        signalingState: pc?.signalingState,
      };
    });
    
    const status2 = await page2.evaluate(() => {
      const pc = window.peerConnectionRef?.current;
      return {
        connected: pc?.connectionState === 'connected',
        iceState: pc?.iceConnectionState,
        signalingState: pc?.signalingState,
      };
    });
    
    const icon1 = status1.connected ? '✅' : '❌';
    const icon2 = status2.connected ? '✅' : '❌';
    console.log(`Check ${i}/4: User1 ${icon1} (${status1.iceState}), User2 ${icon2} (${status2.iceState})`);
    
    if (status1.connected && status2.connected) {
      console.log('\n✅ SUCCESS: Both users connected despite one having no camera/mic!');
      break;
    }
  }

  // Final status
  console.log('\n📊 Final Status:');
  const final1 = await page1.evaluate(() => {
    const pc = window.peerConnectionRef?.current;
    return {
      connectionState: pc?.connectionState,
      iceConnectionState: pc?.iceConnectionState,
      localTracks: window.localStreamRef?.current?.getTracks().length || 0,
      hasRemoteVideo: !!window.remoteVideoRef?.current?.srcObject,
    };
  });
  console.log('User 1 (with camera):', final1);
  
  const final2 = await page2.evaluate(() => {
    const pc = window.peerConnectionRef?.current;
    return {
      connectionState: pc?.connectionState,
      iceConnectionState: pc?.iceConnectionState,
      localTracks: window.localStreamRef?.current?.getTracks().filter(t => t.readyState === 'live').length || 0,
      hasRemoteVideo: !!window.remoteVideoRef?.current?.srcObject,
    };
  });
  console.log('User 2 (no camera):', final2);

  if (final1.connectionState === 'connected' && final2.connectionState === 'connected') {
    console.log('\n✅ TEST PASSED: Connection works with asymmetric media!');
  } else {
    console.log('\n❌ TEST FAILED: Connection issue when one peer has no media');
  }

  console.log('\n⏳ Keeping browsers open for 30 seconds to observe...');
  await new Promise(r => setTimeout(r, 30000));

} catch (error) {
  console.error('\n❌ Test error:', error.message);
} finally {
  console.log('\n🧹 Cleaning up...');
  if (browser) await browser.close();
  console.log('✅ Done');
}
