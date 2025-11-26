#!/usr/bin/env node
/**
 * Simple test - just open 2 browsers and wait
 * Check console logs to debug data channels
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'debug-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🔍 SIMPLE CONNECTION TEST - DEBUG DATA CHANNELS');
console.log('='.repeat(70));

try {
  console.log('\n[1] Launching browsers...');
  const browser1 = await chromium.launch({ headless: false });
  const browser2 = await chromium.launch({ headless: false });

  const page1 = await browser1.newPage();
  const page2 = await browser2.newPage();

  // Log all console messages
  page1.on('console', msg => {
    const text = msg.text();
    if (text.includes('Videolify') || text.includes('DataChannel') || text.includes('✅') || text.includes('❌')) {
      console.log(`[Page1] ${text}`);
    }
  });

  page2.on('console', msg => {
    const text = msg.text();
    if (text.includes('Videolify') || text.includes('DataChannel') || text.includes('✅') || text.includes('❌')) {
      console.log(`[Page2] ${text}`);
    }
  });

  console.log('\n[2] Opening User1...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=User1`);
  await sleep(3000);

  console.log('\n[3] Opening User2...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=User2`);

  console.log('\n[4] Waiting 60s to observe logs...');
  console.log('Watch for:');
  console.log('  - "DataChannel OPEN" messages');
  console.log('  - "onnegotiationneeded fired" messages');
  console.log('  - Any errors\n');

  await sleep(60000);

  // Check final state
  const state1 = await page1.evaluate(() => {
    return {
      connected: document.querySelector('.bg-green-500')?.textContent?.includes('Online'),
      channels: {
        chat: window.chatChannelRef?.current?.readyState,
        whiteboard: window.whiteboardChannelRef?.current?.readyState,
        control: window.controlChannelRef?.current?.readyState,
      }
    };
  });

  console.log('\n📊 Final State:');
  console.log('User1:', state1);

  await browser1.close();
  await browser2.close();

  process.exit(0);

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
}
