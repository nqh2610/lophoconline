#!/usr/bin/env node
/**
 * Simple V2 Auto Test - Just test if connection works
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function startServer() {
  console.log('🚀 Starting server...');
  const server = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });
  
  await new Promise(r => setTimeout(r, 15000)); // Wait 15s for server
  return server;
}

async function main() {
  let server, browser;
  
  try {
    server = await startServer();
    console.log('✅ Server started\n');
    
    browser = await chromium.launch({
      headless: false,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    });
    
    console.log('✅ Browser launched\n');
    
    // Test 1: Normal connection
    console.log('📝 Test 1: Normal Connection');
    console.log('=' .repeat(50));
    
    const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Track connection
    let peer1Connected = false;
    let peer2Connected = false;
    
    page1.on('console', msg => {
      const text = msg.text();
      if (text.includes('Connection state: connected')) {
        peer1Connected = true;
        console.log('  ✅ Peer1 connected!');
      }
    });
    
    page2.on('console', msg => {
      const text = msg.text();
      if (text.includes('Connection state: connected')) {
        peer2Connected = true;
        console.log('  ✅ Peer2 connected!');
      }
    });
    
    console.log('  Opening Tutor page...');
    await page1.goto(`${BASE_URL}/test-videolify-v2?room=test&name=Tutor&role=tutor`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    console.log('  Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('  Opening Student page...');
    await page2.goto(`${BASE_URL}/test-videolify-v2?room=test&name=Student&role=student`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    console.log('  Waiting for connection (20 seconds)...');
    await new Promise(r => setTimeout(r, 20000));
    
    console.log('\n' + '='.repeat(50));
    if (peer1Connected && peer2Connected) {
      console.log('✅ TEST PASSED - Both peers connected successfully!');
      console.log('='.repeat(50));
      console.log('\n🎉 V2 Connection is working!\n');
      
      // Keep browser open for manual inspection
      console.log('Browser will stay open for 60 seconds for inspection...');
      console.log('Press Ctrl+C to exit early.\n');
      await new Promise(r => setTimeout(r, 60000));
      
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED - Connection issue detected');
      console.log(`   Peer1: ${peer1Connected ? '✅' : '❌'}`);
      console.log(`   Peer2: ${peer2Connected ? '✅' : '❌'}`);
      console.log('='.repeat(50));
      
      // Keep browser open for debugging
      console.log('\n⚠️ Browser will stay open for debugging (60s)...\n');
      await new Promise(r => setTimeout(r, 60000));
      
      process.exit(1);
    }
    
  } catch (err) {
    console.error('\n❌ Fatal Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
