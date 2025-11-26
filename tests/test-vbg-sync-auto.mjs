/**
 * AUTO TEST: Virtual Background Synchronization Issues
 * 
 * Test cases:
 * 1. Local chọn background mới → Peer should see it
 * 2. Join với background từ localStorage → Peer should see it
 * 3. F5 với background → Peer should see it
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const TEST_ROOM = `vbg-sync-test-${Date.now()}`;

// Preset backgrounds để test
const PRESET_BACKGROUNDS = [
  { name: 'Office', selector: 'button:has-text("Office")' },
  { name: 'Beach', selector: 'button:has-text("Beach")' },
  { name: 'Mountains', selector: 'button:has-text("Mountains")' }
];

let browser1, browser2;
let page1, page2;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupBrowser(name) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--no-sandbox'
    ]
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[VBG]') || text.includes('vbg-settings') || text.includes('Broadcasting')) {
      console.log(`[${name}] ${text}`);
    }
  });
  
  // Setup permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE_URL, ['camera', 'microphone']);
  
  return { browser, page };
}

async function login(page, email, password, name) {
  console.log(`\n[${name}] Logging in...`);
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  await delay(2000);
  console.log(`[${name}] ✅ Logged in`);
}

async function joinVideoCall(page, roomId, name) {
  console.log(`\n[${name}] Joining room: ${roomId}`);
  
  const url = `${BASE_URL}/video-call/${roomId}`;
  await page.goto(url);
  
  // Wait for video call UI
  await page.waitForSelector('video', { timeout: 15000 });
  await delay(3000);
  
  console.log(`[${name}] ✅ Joined video call`);
}

async function selectBackground(page, backgroundName, name) {
  console.log(`\n[${name}] Selecting background: ${backgroundName}`);
  
  try {
    // Click background settings button (usually camera icon or settings)
    const settingsButton = await page.$('button[aria-label*="Background"], button[title*="Background"], button:has-text("Background")');
    if (settingsButton) {
      await settingsButton.click();
      await delay(1000);
    }
    
    // Find and click the preset background button
    const presetButton = await page.evaluateHandle((bgName) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes(bgName) || btn.getAttribute('data-preset') === bgName);
    }, backgroundName);
    
    if (presetButton) {
      await presetButton.click();
      console.log(`[${name}] ✅ Clicked ${backgroundName} button`);
      await delay(3000); // Wait for processing
    } else {
      console.log(`[${name}] ❌ Background button not found: ${backgroundName}`);
    }
  } catch (err) {
    console.error(`[${name}] ❌ Error selecting background:`, err.message);
  }
}

async function checkVBGSettings(page, name) {
  console.log(`\n[${name}] Checking VBG settings in localStorage...`);
  
  const vbgData = await page.evaluate(() => {
    return {
      enabled: localStorage.getItem('vbg-enabled'),
      mode: localStorage.getItem('vbg-last-mode'),
      background: localStorage.getItem('vbg-last-background'),
      imageUrl: localStorage.getItem('vbg-background-image')
    };
  });
  
  console.log(`[${name}] VBG Settings:`, vbgData);
  return vbgData;
}

async function checkRemoteVBGSettings(page, peerId, name) {
  console.log(`\n[${name}] Checking remote peer VBG settings in localStorage...`);
  
  const remotVbgData = await page.evaluate((pid) => {
    return {
      mode: localStorage.getItem(`peer-${pid}-vbg-mode`),
      blur: localStorage.getItem(`peer-${pid}-vbg-blur`),
      background: localStorage.getItem(`peer-${pid}-vbg-background`)
    };
  }, peerId);
  
  console.log(`[${name}] Remote VBG Settings for peer ${peerId}:`, remotVbgData);
  return remotVbgData;
}

async function getPeerId(page, name) {
  const peerId = await page.evaluate(() => {
    // Try to find peer ID from DOM or window object
    return window.peerIdRef?.current || null;
  });
  
  console.log(`[${name}] Peer ID:`, peerId);
  return peerId;
}

async function checkSSEConnection(page, name) {
  console.log(`\n[${name}] Checking SSE connection...`);
  
  const sseStatus = await page.evaluate(() => {
    // Check if EventSource is connected
    const es = window.eventSource;
    if (es) {
      return {
        readyState: es.readyState, // 0=CONNECTING, 1=OPEN, 2=CLOSED
        url: es.url
      };
    }
    return null;
  });
  
  console.log(`[${name}] SSE Status:`, sseStatus);
  return sseStatus;
}

// ==================== TEST CASES ====================

async function testCase1_SelectNewBackground() {
  console.log('\n\n🧪 ========== TEST CASE 1: Local chọn background mới ==========\n');
  
  // Both peers join
  await joinVideoCall(page1, TEST_ROOM, 'Peer A');
  await delay(2000);
  await joinVideoCall(page2, TEST_ROOM, 'Peer B');
  await delay(3000); // Wait for P2P connection
  
  console.log('\n📊 BEFORE: Checking initial state...');
  await checkVBGSettings(page1, 'Peer A');
  await checkVBGSettings(page2, 'Peer B');
  
  // Peer A selects background
  console.log('\n🎬 ACTION: Peer A selects Office background...');
  await selectBackground(page1, 'Office', 'Peer A');
  await delay(5000); // Wait for MediaPipe + SSE broadcast
  
  console.log('\n📊 AFTER: Checking VBG settings...');
  const vbgA = await checkVBGSettings(page1, 'Peer A');
  const vbgB = await checkVBGSettings(page2, 'Peer B');
  
  // Check if Peer B received settings
  const peerAId = await getPeerId(page1, 'Peer A');
  if (peerAId) {
    const remoteBSettings = await checkRemoteVBGSettings(page2, peerAId, 'Peer B');
    
    console.log('\n📊 RESULT:');
    if (remoteBSettings.mode === 'image' && remoteBSettings.background) {
      console.log('✅ TEST PASSED: Peer B received VBG settings from Peer A');
      return true;
    } else {
      console.log('❌ TEST FAILED: Peer B did NOT receive VBG settings');
      console.log('Expected mode: image, Got:', remoteBSettings.mode);
      console.log('Expected background URL, Got:', remoteBSettings.background);
      return false;
    }
  } else {
    console.log('❌ TEST FAILED: Could not get Peer A ID');
    return false;
  }
}

async function testCase2_JoinWithLocalStorage() {
  console.log('\n\n🧪 ========== TEST CASE 2: Join với background từ localStorage ==========\n');
  
  // Setup: Peer A selects background, then leaves
  console.log('\n🎬 SETUP: Peer A joins, selects background, then leaves...');
  await joinVideoCall(page1, TEST_ROOM, 'Peer A');
  await delay(2000);
  await selectBackground(page1, 'Beach', 'Peer A');
  await delay(5000);
  
  const vbgBefore = await checkVBGSettings(page1, 'Peer A');
  console.log('Peer A background saved to localStorage:', vbgBefore);
  
  // Close and rejoin Peer A (simulates F5 but with localStorage intact)
  console.log('\n🎬 ACTION: Peer A leaves and rejoins (background should auto-restore)...');
  await page1.close();
  await delay(2000);
  
  // Create new page for Peer A
  const { page: newPage1 } = await setupBrowser('Peer A (Rejoined)');
  page1 = newPage1;
  
  await login(page1, 'test1@example.com', 'password123', 'Peer A');
  await joinVideoCall(page1, TEST_ROOM, 'Peer A');
  await delay(8000); // Wait for auto-restore (5s delay + processing)
  
  // Check if Peer A restored background
  const vbgAfter = await checkVBGSettings(page1, 'Peer A');
  console.log('Peer A background after rejoin:', vbgAfter);
  
  // Now Peer B joins
  console.log('\n🎬 Peer B joins after Peer A already has background...');
  await joinVideoCall(page2, TEST_ROOM, 'Peer B');
  await delay(5000);
  
  // Check if Peer B received settings
  const peerAId = await getPeerId(page1, 'Peer A');
  if (peerAId) {
    const remoteBSettings = await checkRemoteVBGSettings(page2, peerAId, 'Peer B');
    
    console.log('\n📊 RESULT:');
    if (remoteBSettings.mode === 'image' && remoteBSettings.background) {
      console.log('✅ TEST PASSED: Peer B received VBG settings when joining');
      return true;
    } else {
      console.log('❌ TEST FAILED: Peer B did NOT receive VBG settings');
      console.log('Expected mode: image, Got:', remoteBSettings.mode);
      return false;
    }
  } else {
    console.log('❌ TEST FAILED: Could not get Peer A ID');
    return false;
  }
}

async function testCase3_F5WithBackground() {
  console.log('\n\n🧪 ========== TEST CASE 3: F5 với background ==========\n');
  
  // Both peers join and Peer A has background
  console.log('\n🎬 SETUP: Both peers join, Peer A has background...');
  await joinVideoCall(page1, TEST_ROOM, 'Peer A');
  await delay(2000);
  await joinVideoCall(page2, TEST_ROOM, 'Peer B');
  await delay(3000);
  
  await selectBackground(page1, 'Mountains', 'Peer A');
  await delay(5000);
  
  const vbgBefore = await checkVBGSettings(page1, 'Peer A');
  console.log('Peer A background before F5:', vbgBefore);
  
  // F5 Peer A
  console.log('\n🎬 ACTION: Peer A presses F5...');
  await page1.reload();
  await delay(8000); // Wait for page load + auto-restore
  
  // Check if Peer A restored
  const vbgAfter = await checkVBGSettings(page1, 'Peer A');
  console.log('Peer A background after F5:', vbgAfter);
  
  // Check if Peer B still has remote settings
  const peerAId = await getPeerId(page1, 'Peer A');
  if (peerAId) {
    await delay(3000); // Wait for SSE sync
    const remoteBSettings = await checkRemoteVBGSettings(page2, peerAId, 'Peer B');
    
    console.log('\n📊 RESULT:');
    if (remoteBSettings.mode === 'image' && remoteBSettings.background) {
      console.log('✅ TEST PASSED: Peer B still has VBG settings after Peer A F5');
      return true;
    } else {
      console.log('❌ TEST FAILED: Peer B lost VBG settings after Peer A F5');
      console.log('Expected mode: image, Got:', remoteBSettings.mode);
      return false;
    }
  } else {
    console.log('❌ TEST FAILED: Could not get Peer A ID');
    return false;
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('🚀 Starting VBG Sync Automated Tests...\n');
  
  try {
    // Setup browsers
    console.log('Setting up browsers...');
    ({ browser: browser1, page: page1 } = await setupBrowser('Peer A'));
    ({ browser: browser2, page: page2 } = await setupBrowser('Peer B'));
    
    // Login both
    await login(page1, 'test1@example.com', 'password123', 'Peer A');
    await login(page2, 'test2@example.com', 'password123', 'Peer B');
    
    // Run tests
    const results = {
      test1: await testCase1_SelectNewBackground(),
      test2: await testCase2_JoinWithLocalStorage(),
      test3: await testCase3_F5WithBackground()
    };
    
    // Summary
    console.log('\n\n📊 ========== TEST SUMMARY ==========\n');
    console.log('Test 1 (Select new background):', results.test1 ? '✅ PASSED' : '❌ FAILED');
    console.log('Test 2 (Join with localStorage):', results.test2 ? '✅ PASSED' : '❌ FAILED');
    console.log('Test 3 (F5 with background):', results.test3 ? '✅ PASSED' : '❌ FAILED');
    
    const allPassed = Object.values(results).every(r => r === true);
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - Check logs above for details');
    }
    
  } catch (err) {
    console.error('\n❌ Test execution error:', err);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
  }
}

main().catch(console.error);
