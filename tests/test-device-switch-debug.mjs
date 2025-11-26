/**
 * DEBUG VERSION: Test Device Switch with Server-Side Logging
 * Check if SSE disconnect triggers properly
 */

import playwright from 'playwright';
const { chromium } = playwright;
import { setTimeout as sleep } from 'timers/promises';

const SERVER_URL = 'http://localhost:3000';
const ROOM_ID = 'test-debug-' + Date.now();

async function setupBrowser(browserType, name, role) {
  const browser = await browserType.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ]
  });
  
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });
  const page = await context.newPage();

  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Peer left') || 
        text.includes('peer-left') ||
        text.includes('P2P Connection') || 
        text.includes('disconnected')) {
      console.log(`[${name}] ${text}`);
    }
  });

  const url = `${SERVER_URL}/test-videolify?room=${ROOM_ID}&name=${name}&role=${role}`;
  console.log(`[${name}] Opening: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await sleep(2000);

  return { browser, context, page };
}

async function runTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEBUG: Testing SSE Disconnect Detection');
  console.log('='.repeat(80));

  let user1, user2;

  try {
    // Phase 1: Connect both users
    console.log('\n📌 Phase 1: Connect User1 and User2');
    user1 = await setupBrowser(chromium, 'User1', 'tutor');
    await sleep(2000);
    
    user2 = await setupBrowser(chromium, 'User2', 'student');
    await sleep(5000);
    
    console.log('✅ Both users connected');

    // Phase 2: Close User2 browser and monitor
    console.log('\n📌 Phase 2: Close User2 browser');
    console.log('🔴 Closing User2 browser...');
    
    await user2.browser.close();
    user2 = null;
    
    console.log('\n⏳ Monitoring User1 for 30s to detect peer-left event...');
    console.log('👀 Watch User1 browser console for "Peer left" message');
    console.log('👀 Watch terminal for SSE logs');
    
    // Wait and watch
    for (let i = 1; i <= 30; i++) {
      await sleep(1000);
      if (i % 5 === 0) {
        console.log(`... ${i}s elapsed ...`);
      }
    }

    console.log('\n📊 If you see "Peer left" above, SSE disconnect works!');
    console.log('📊 If not, SSE abort event is not triggering properly');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    console.log('\n🧹 Cleaning up...');
    if (user1) await user1.browser.close();
    if (user2) await user2.browser.close();
  }
}

// Check server
console.log('🔍 Checking server...');
try {
  const response = await fetch(SERVER_URL);
  if (!response.ok) throw new Error('Server not running');
  console.log('✅ Server running\n');
  await runTest();
} catch (error) {
  console.error('❌ Server not running. Start with: npm run dev');
  process.exit(1);
}
