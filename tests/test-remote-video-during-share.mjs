import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Starting Remote Video During Screen Share Test...\n');

  let browser1, browser2, page1, page2;

  try {
    // Launch 2 browsers
    console.log('📱 Launching browsers...');
    [browser1, browser2] = await Promise.all([
      puppeteer.launch({
        headless: false,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--auto-select-desktop-capture-source=Entire screen',
          '--enable-usermedia-screen-capturing',
          '--allow-http-screen-capture',
          '--disable-features=WebRtcHideLocalIpsWithMdns'
        ]
      }),
      puppeteer.launch({
        headless: false,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--disable-features=WebRtcHideLocalIpsWithMdns'
        ]
      })
    ]);

    page1 = await browser1.newPage();
    page2 = await browser2.newPage();

    await page1.setViewport({ width: 1280, height: 720 });
    await page2.setViewport({ width: 1280, height: 720 });

    // Enable console logging
    page1.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Debug]') || text.includes('Remote video') || text.includes('Screen share')) {
        console.log('📄 [Page 1]:', text);
      }
    });

    page2.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Debug]') || text.includes('Remote video')) {
        console.log('📄 [Page 2]:', text);
      }
    });

    // Generate room ID
    const roomId = `test-${Date.now()}`;
    const url1 = `http://localhost:3000/test-videolify?room=${roomId}&testUserId=1&name=Tutor&role=tutor`;
    const url2 = `http://localhost:3000/test-videolify?room=${roomId}&testUserId=2&name=Student&role=student`;

    console.log(`📌 Room: ${roomId}`);
    console.log(`📌 Page 1 (Tutor): ${url1}`);
    console.log(`📌 Page 2 (Student): ${url2}\n`);

    // Navigate both pages
    console.log('📌 STEP 1: Opening room in both browsers...');
    await Promise.all([
      page1.goto(url1, { waitUntil: 'networkidle2', timeout: 30000 }),
      page2.goto(url2, { waitUntil: 'networkidle2', timeout: 30000 })
    ]);

    console.log('✅ Both pages loaded\n');

    // Wait for P2P connection
    console.log('📌 STEP 2: Waiting for P2P connection...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check connection status
    const [connected1, connected2] = await Promise.all([
      page1.evaluate(() => document.body.innerText.includes('Connected')),
      page2.evaluate(() => document.body.innerText.includes('Connected'))
    ]);

    console.log(`   Page 1 connected: ${connected1 ? '✅' : '❌'}`);
    console.log(`   Page 2 connected: ${connected2 ? '✅' : '❌'}\n`);

    if (!connected1 || !connected2) {
      console.log('⚠️  P2P connection failed, but continuing test...\n');
    }

    // Wait a bit more for streams to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // STEP 3: Check remote video BEFORE screen share (from Page 1's perspective)
    console.log('📌 STEP 3: Checking Page 1 remote video BEFORE screen share...');
    const beforeShare = await page1.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      if (!remoteVideo) return { exists: false };

      const computedStyle = window.getComputedStyle(remoteVideo);
      return {
        exists: true,
        hasStream: !!remoteVideo.srcObject,
        isVisible: computedStyle.display !== 'none',
        className: remoteVideo.className,
        display: computedStyle.display,
        streamTracks: remoteVideo.srcObject ? remoteVideo.srcObject.getTracks().length : 0
      };
    });

    console.log('   Remote video exists:', beforeShare.exists ? '✅' : '❌');
    console.log('   Has stream:', beforeShare.hasStream ? '✅' : '❌');
    console.log('   Is visible:', beforeShare.isVisible ? '✅' : '❌');
    console.log('   Stream tracks:', beforeShare.streamTracks);
    console.log('   Display style:', beforeShare.display);
    console.log('   ClassName:', beforeShare.className);
    console.log('');

    // STEP 4: Start screen share on Page 1
    console.log('📌 STEP 4: Starting screen share on Page 1...');
    
    // Click screen share button using data-testid
    const clicked = await page1.evaluate(() => {
      const screenShareBtn = document.querySelector('[data-testid="toggle-screen-share-btn"]');
      
      if (screenShareBtn) {
        console.log('🖱️ Clicking screen share button...');
        screenShareBtn.click();
        return true;
      }
      console.log('❌ Screen share button not found');
      return false;
    });

    if (!clicked) {
      console.log('   ❌ Could not start screen share - button not found');
    } else {
      console.log('   ✅ Screen share button clicked');
    }

    console.log('   Waiting for screen share to activate...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // STEP 5: Check remote video DURING screen share (THE BUG!)
    console.log('📌 STEP 5: Checking Page 1 remote video DURING screen share...');
    const duringShare = await page1.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      if (!remoteVideo) return { exists: false };

      const computedStyle = window.getComputedStyle(remoteVideo);
      return {
        exists: true,
        hasStream: !!remoteVideo.srcObject,
        isVisible: computedStyle.display !== 'none',
        className: remoteVideo.className,
        display: computedStyle.display,
        streamTracks: remoteVideo.srcObject ? remoteVideo.srcObject.getTracks().length : 0
      };
    });

    console.log('   Remote video exists:', duringShare.exists ? '✅' : '❌');
    console.log('   Has stream:', duringShare.hasStream ? '✅' : '❌');
    console.log('   Is visible:', duringShare.isVisible ? '✅' : '❌');
    console.log('   Stream tracks:', duringShare.streamTracks);
    console.log('   Display style:', duringShare.display);
    console.log('   ClassName:', duringShare.className);
    console.log('');

    // STEP 6: Stop screen share
    console.log('📌 STEP 6: Stopping screen share on Page 1...');
    
    const stopped = await page1.evaluate(() => {
      const screenShareBtn = document.querySelector('[data-testid="toggle-screen-share-btn"]');
      
      if (screenShareBtn) {
        console.log('🖱️ Clicking stop screen share button...');
        screenShareBtn.click();
        return true;
      }
      console.log('❌ Stop screen share button not found');
      return false;
    });

    if (stopped) {
      console.log('   ✅ Stop button clicked');
    }

    console.log('   Waiting for screen share to stop...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // STEP 7: Check remote video AFTER screen share
    console.log('📌 STEP 7: Checking Page 1 remote video AFTER screen share...');
    const afterShare = await page1.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      if (!remoteVideo) return { exists: false };

      const computedStyle = window.getComputedStyle(remoteVideo);
      return {
        exists: true,
        hasStream: !!remoteVideo.srcObject,
        isVisible: computedStyle.display !== 'none',
        className: remoteVideo.className,
        display: computedStyle.display,
        streamTracks: remoteVideo.srcObject ? remoteVideo.srcObject.getTracks().length : 0
      };
    });

    console.log('   Remote video exists:', afterShare.exists ? '✅' : '❌');
    console.log('   Has stream:', afterShare.hasStream ? '✅' : '❌');
    console.log('   Is visible:', afterShare.isVisible ? '✅' : '❌');
    console.log('   Stream tracks:', afterShare.streamTracks);
    console.log('   Display style:', afterShare.display);
    console.log('   ClassName:', afterShare.className);
    console.log('');

    // ========================================
    // ANALYZE RESULTS
    // ========================================
    console.log('\n📊 TEST RESULTS\n');
    console.log('=' .repeat(60));

    console.log('\n1️⃣ BEFORE Screen Share:');
    console.log(`   Stream: ${beforeShare.hasStream ? '✅ YES' : '❌ NO'}`);
    console.log(`   Visible: ${beforeShare.isVisible ? '✅ YES' : '❌ NO'}`);

    console.log('\n2️⃣ DURING Screen Share:');
    console.log(`   Stream: ${duringShare.hasStream ? '✅ YES' : '❌ NO'}`);
    console.log(`   Visible: ${duringShare.isVisible ? '✅ YES' : '❌ NO'}`);

    console.log('\n3️⃣ AFTER Screen Share:');
    console.log(`   Stream: ${afterShare.hasStream ? '✅ YES' : '❌ NO'}`);
    console.log(`   Visible: ${afterShare.isVisible ? '✅ YES' : '❌ NO'}`);

    console.log('\n' + '='.repeat(60));

    // Determine if bug exists
    const bugFound = beforeShare.isVisible && !duringShare.isVisible;
    const streamLost = beforeShare.hasStream && !duringShare.hasStream;
    const notRestored = beforeShare.isVisible && !afterShare.isVisible;

    if (bugFound || streamLost || notRestored) {
      console.log('\n❌ BUG FOUND:\n');
      if (streamLost) {
        console.log('   - Remote video STREAM lost during screen share');
      }
      if (bugFound) {
        console.log('   - Remote video became INVISIBLE during screen share');
      }
      if (notRestored && !streamLost) {
        console.log('   - Remote video NOT RESTORED after screen share');
      }
      
      console.log('\n🔍 ROOT CAUSE ANALYSIS:');
      if (duringShare.display === 'none') {
        console.log('   - CSS display is "none" (hidden by CSS class)');
        console.log('   - Check className logic in JSX');
      }
      if (!duringShare.hasStream && beforeShare.hasStream) {
        console.log('   - srcObject was removed/lost');
        console.log('   - Check if anything clears remoteVideoRef.srcObject');
      }
    } else {
      console.log('\n✅ TEST PASSED - Remote video remained visible!\n');
    }

    console.log('\nTest will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
    console.log('\n✅ Test completed');
  }
})();
