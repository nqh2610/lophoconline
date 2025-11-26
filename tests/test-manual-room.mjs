import puppeteer from 'puppeteer';

const ROOM_ID = '6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';

console.log('🎬 Testing Manual Room with Chrome + Edge');
console.log('=========================================');

let browserChrome, browserEdge, pageChrome, pageEdge;

try {
  // Launch Chrome
  console.log('\n📦 Launching Chrome...');
  browserChrome = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
    ],
  });
  pageChrome = await browserChrome.newPage();
  
  // Capture Chrome console
  pageChrome.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Videolify]') || text.includes('Error') || text.includes('Failed')) {
      console.log('[Chrome]', text);
    }
  });

  // Launch Edge
  console.log('📦 Launching Edge...');
  try {
    browserEdge = await puppeteer.launch({
      headless: false,
      channel: 'msedge',
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
      ],
    });
  } catch (edgeError) {
    console.log('⚠️  Edge channel not found, trying executablePath...');
    browserEdge = await puppeteer.launch({
      headless: false,
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
      ],
    });
  }
  pageEdge = await browserEdge.newPage();
  
  // Capture Edge console
  pageEdge.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Videolify]') || text.includes('Error') || text.includes('Failed')) {
      console.log('[Edge]', text);
    }
  });

  // Navigate Chrome
  console.log('\n📝 Chrome opening TutorA...');
  await pageChrome.goto(`http://localhost:3000/test-videolify?room=${ROOM_ID}&name=TutorA&role=tutor`, {
    waitUntil: 'networkidle2'
  });
  await new Promise(r => setTimeout(r, 3000));

  // Navigate Edge
  console.log('📝 Edge opening StudentB...');
  await pageEdge.goto(`http://localhost:3000/test-videolify?room=${ROOM_ID}&name=StudentB&role=student`, {
    waitUntil: 'networkidle2'
  });

  // Wait and check status every 5 seconds
  console.log('\n⏳ Monitoring connection for 30 seconds...\n');
  
  for (let i = 1; i <= 6; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    const chromeStatus = await pageChrome.evaluate(() => {
      const pc = window.peerConnectionRef?.current;
      return {
        connected: pc?.connectionState === 'connected',
        iceState: pc?.iceConnectionState,
        signalingState: pc?.signalingState,
        remotePeer: window.remotePeerIdRef?.current,
      };
    });
    
    const edgeStatus = await pageEdge.evaluate(() => {
      const pc = window.peerConnectionRef?.current;
      return {
        connected: pc?.connectionState === 'connected',
        iceState: pc?.iceConnectionState,
        signalingState: pc?.signalingState,
        remotePeer: window.remotePeerIdRef?.current,
      };
    });
    
    const chromeIcon = chromeStatus.connected ? '✅' : '❌';
    const edgeIcon = edgeStatus.connected ? '✅' : '❌';
    
    console.log(`Check ${i}/6: Chrome ${chromeIcon} (${chromeStatus.iceState}), Edge ${edgeIcon} (${edgeStatus.iceState})`);
    
    if (chromeStatus.connected && edgeStatus.connected) {
      console.log('\n✅ SUCCESS: Both browsers connected!');
      break;
    }
  }

  // Final status
  console.log('\n📊 Final Status:');
  const chromeFinal = await pageChrome.evaluate(() => {
    const pc = window.peerConnectionRef?.current;
    return {
      connectionState: pc?.connectionState,
      iceConnectionState: pc?.iceConnectionState,
      signalingState: pc?.signalingState,
      remotePeerId: window.remotePeerIdRef?.current,
      hasRemoteVideo: !!window.remoteVideoRef?.current?.srcObject,
    };
  });
  console.log('Chrome:', chromeFinal);
  
  const edgeFinal = await pageEdge.evaluate(() => {
    const pc = window.peerConnectionRef?.current;
    return {
      connectionState: pc?.connectionState,
      iceConnectionState: pc?.iceConnectionState,
      signalingState: pc?.signalingState,
      remotePeerId: window.remotePeerIdRef?.current,
      hasRemoteVideo: !!window.remoteVideoRef?.current?.srcObject,
    };
  });
  console.log('Edge:', edgeFinal);

  console.log('\n✅ Test completed - browsers will stay open for 60 seconds');
  console.log('⚠️  Check the browser windows for actual video/connection state');
  
  await new Promise(r => setTimeout(r, 60000));

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
} finally {
  console.log('\n🧹 Cleaning up...');
  if (browserChrome) await browserChrome.close();
  if (browserEdge) await browserEdge.close();
  console.log('✅ Done');
}
