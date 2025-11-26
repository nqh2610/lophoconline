/**
 * SIMPLE AUTO TEST: Remote Video Issue
 * Test remote video khi share màn hình (không cần login)
 */

import puppeteer from 'puppeteer';

const SERVER_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupBrowser() {
  return await puppeteer.launch({
    headless: false, // Show browser
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
      '--disable-web-security',
      '--auto-select-desktop-capture-source=Entire screen',
    ],
  });
}

async function testRemoteVideo() {
  console.log('\n🧪 AUTO TEST: Remote Video During Screen Share\n');
  console.log('='.repeat(70));
  
  const browser1 = await setupBrowser();
  const browser2 = await setupBrowser();
  
  try {
    const page1 = await browser1.newPage();
    const page2 = await browser2.newPage();
    
    // Listen to console logs
    page1.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Prevention]') || text.includes('[Debug]') || text.includes('[Remote Video]')) {
        console.log(`   📝 [PAGE1] ${text}`);
      }
    });
    
    page2.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Remote Video]')) {
        console.log(`   📺 [PAGE2] ${text}`);
      }
    });
    
    // Create test room
    const roomId = `test-${Date.now()}`;
    const roomUrl = `${SERVER_URL}/room/${roomId}`;
    
    console.log(`\n📌 STEP 1: Open room in 2 browsers`);
    console.log(`   Room: ${roomUrl}`);
    
    await page1.goto(roomUrl);
    await sleep(2000);
    await page2.goto(roomUrl);
    await sleep(2000);
    console.log('   ✅ Both pages loaded');
    
    console.log(`\n📌 STEP 2: Wait for P2P connection`);
    await sleep(8000);
    
    // Check connection - simple method
    const page1Text = await page1.evaluate(() => document.body.innerText);
    const page2Text = await page2.evaluate(() => document.body.innerText);
    
    const page1Connected = page1Text.includes('Connected') || page1Text.includes('connected');
    const page2Connected = page2Text.includes('Connected') || page2Text.includes('connected');
    
    console.log(`   Page 1 connected: ${page1Connected ? '✅' : '❌'}`);
    console.log(`   Page 2 connected: ${page2Connected ? '✅' : '❌'}`);
    
    console.log(`\n📌 STEP 3: Check INITIAL remote video (Page 2 sees Page 1)`);
    const before = await page2.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      if (!remoteVideo) return { exists: false };
      
      const hasStream = !!remoteVideo.srcObject;
      const style = window.getComputedStyle(remoteVideo);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      
      return {
        exists: true,
        hasStream,
        isVisible,
        display: style.display,
        className: remoteVideo.className
      };
    });
    
    console.log(`   Remote video exists: ${before.exists ? '✅' : '❌'}`);
    console.log(`   Has stream: ${before.hasStream ? '✅' : '❌'}`);
    console.log(`   Is visible: ${before.isVisible ? '✅' : '❌'}`);
    console.log(`   Display: ${before.display}`);
    
    console.log(`\n📌 STEP 4: Page 1 starts SCREEN SHARE`);
    const btnClicked = await page1.evaluate(() => {
      const btn = document.querySelector('[data-testid="screen-share-btn"]') ||
                   document.querySelector('button[title*="screen"]') ||
                   document.querySelector('button:has(svg)');
      
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (!btnClicked) {
      console.log('   ❌ Cannot find screen share button - aborting test');
      return;
    }
    
    console.log('   🖥️ Clicked screen share');
    await sleep(4000);
    
    console.log(`\n📌 STEP 5: Check remote video DURING screen share`);
    const during = await page2.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      if (!remoteVideo) return { exists: false };
      
      const hasStream = !!remoteVideo.srcObject;
      const style = window.getComputedStyle(remoteVideo);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      
      return {
        exists: true,
        hasStream,
        isVisible,
        display: style.display
      };
    });
    
    console.log(`   Remote video exists: ${during.exists ? '✅' : '❌'}`);
    console.log(`   Has stream: ${during.hasStream ? '✅' : '❌'}`);
    console.log(`   Is visible: ${during.isVisible ? '✅' : '❌'}`);
    console.log(`   Display: ${during.display}`);
    
    console.log(`\n📌 STEP 6: Page 1 STOPS screen share`);
    await page1.evaluate(() => {
      const btn = document.querySelector('[data-testid="screen-share-btn"]');
      if (btn) btn.click();
    });
    console.log('   🛑 Stopped screen share');
    await sleep(4000);
    
    console.log(`\n📌 STEP 7: Check remote video AFTER stopping`);
    const after = await page2.evaluate(() => {
      const remoteVideo = document.querySelector('[data-testid="remote-video"]');
      if (!remoteVideo) return { exists: false };
      
      const hasStream = !!remoteVideo.srcObject;
      const style = window.getComputedStyle(remoteVideo);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      
      return {
        exists: true,
        hasStream,
        isVisible,
        display: style.display
      };
    });
    
    console.log(`   Remote video exists: ${after.exists ? '✅' : '❌'}`);
    console.log(`   Has stream: ${after.hasStream ? '✅' : '❌'}`);
    console.log(`   Is visible: ${after.isVisible ? '✅' : '❌'}`);
    console.log(`   Display: ${after.display}`);
    
    // RESULTS
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(70));
    
    console.log('\n1️⃣ BEFORE Screen Share:');
    console.log(`   ✅ Stream: ${before.hasStream ? 'YES' : 'NO'}`);
    console.log(`   ✅ Visible: ${before.isVisible ? 'YES' : 'NO'}`);
    
    console.log('\n2️⃣ DURING Screen Share:');
    console.log(`   ${during.hasStream ? '✅' : '❌'} Stream: ${during.hasStream ? 'YES' : 'NO'}`);
    console.log(`   ${during.isVisible ? '✅' : '❌'} Visible: ${during.isVisible ? 'YES' : 'NO'}`);
    
    console.log('\n3️⃣ AFTER Screen Share:');
    console.log(`   ${after.hasStream ? '✅' : '❌'} Stream: ${after.hasStream ? 'YES' : 'NO'}`);
    console.log(`   ${after.isVisible ? '✅' : '❌'} Visible: ${after.isVisible ? 'YES' : 'NO'}`);
    
    console.log('\n' + '='.repeat(70));
    const passed = before.isVisible && during.isVisible && after.isVisible && 
                   before.hasStream && during.hasStream && after.hasStream;
    
    if (passed) {
      console.log('✅ TEST PASSED: Remote video works correctly!');
    } else {
      console.log('❌ BUG FOUND:');
      if (!during.isVisible || !during.hasStream) {
        console.log('   - Remote video LOST during screen share');
      }
      if (!after.isVisible || !after.hasStream) {
        console.log('   - Remote video NOT RESTORED after screen share');
      }
    }
    console.log('='.repeat(70));
    
    console.log('\n⏸️  Keeping browsers open for 20 seconds...');
    await sleep(20000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser1.close();
    await browser2.close();
  }
}

testRemoteVideo().catch(console.error);
