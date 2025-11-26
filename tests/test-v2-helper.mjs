#!/usr/bin/env node
/**
 * V2 Test Helper - Opens 2 browser windows for manual testing
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = `test-${Date.now()}`;

async function main() {
  console.log('🚀 Opening test browsers...\n');
  console.log(`Room: ${ROOM}\n`);
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });
  
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });
  
  // Open 2 pages
  const tutor = await context.newPage();
  const student = await context.newPage();
  
  // Listen for connection logs
  tutor.on('console', msg => {
    if (msg.text().includes('Connection state:')) {
      console.log(`[TUTOR] ${msg.text()}`);
    }
  });
  
  student.on('console', msg => {
    if (msg.text().includes('Connection state:')) {
      console.log(`[STUDENT] ${msg.text()}`);
    }
  });
  
  console.log('📖 Opening Tutor page...');
  await tutor.goto(`${BASE_URL}/test-videolify-v2?room=${ROOM}&name=Tutor&role=tutor`);
  
  console.log('⏳ Waiting 5 seconds...\n');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('📖 Opening Student page...');
  await student.goto(`${BASE_URL}/test-videolify-v2?room=${ROOM}&name=Student&role=student`);
  
  console.log('\n✅ Both pages opened!');
  console.log('=' .repeat(60));
  console.log('Watch console logs above for connection status.');
  console.log('You should see:');
  console.log('  [TUTOR] Connection state: connected');
  console.log('  [STUDENT] Connection state: connected');
  console.log('=' .repeat(60));
  console.log('\nBrowser will stay open for 2 minutes.');
  console.log('Press Ctrl+C to exit early.\n');
  
  // Keep alive for 2 minutes
  await new Promise(r => setTimeout(r, 120000));
  
  await browser.close();
  console.log('\n👋 Test complete!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
