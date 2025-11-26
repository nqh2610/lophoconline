#!/usr/bin/env node
/**
 * AUTO TEST - Using Playwright for better stability
 */

import { chromium } from 'playwright';

const ROOM = `auto-${Date.now()}`;
const BASE_URL = 'http://localhost:3000/test-videolify';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runTest() {
  console.log('🧪 AUTO CONNECTION TEST');
  console.log('======================\n');

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  try {
    // Create 2 contexts
    const tutorContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const studentContext = await browser.newContext({ permissions: ['camera', 'microphone'] });

    const tutorPage = await tutorContext.newPage();
    const studentPage = await studentContext.newPage();

    // Track timing logs
    const timings = { tutor: [], student: [] };

    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[TIMING]')) {
        timings.tutor.push(text);
        console.log('🟦 TUTOR:', text);
      }
    });

    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[TIMING]')) {
        timings.student.push(text);
        console.log('🟩 STUDENT:', text);
      }
    });

    // TEST 1: Fresh Join
    console.log('\n📝 TEST 1: Fresh Join with Media');
    console.log('----------------------------------');
    
    const t0 = Date.now();
    
    await tutorPage.goto(`${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor`);
    console.log('  ✓ Tutor loaded');
    
    await sleep(2000);
    
    await studentPage.goto(`${BASE_URL}?room=${ROOM}&name=Student&role=student`);
    console.log('  ✓ Student loaded');

    // Wait for connection
    let connected = false;
    for (let i = 0; i < 50; i++) {
      const isConnected = await tutorPage.evaluate(() => {
        const indicator = document.querySelector('[data-testid="connection-indicator"]');
        return indicator?.getAttribute('data-connected') === 'true';
      });
      
      if (isConnected) {
        connected = true;
        break;
      }
      await sleep(200);
    }

    const t1 = Date.now();
    const totalTime = t1 - t0;

    if (connected) {
      console.log(`  ✅ Connected in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
      
      if (totalTime > 6000) {
        console.log('  ⚠️  SLOW - expected <6s');
      }
    } else {
      console.log('  ❌ FAILED - timeout');
    }

    // Print timing details
    console.log('\n📊 Timing Details:');
    console.log('------------------');
    console.log('\n🟦 TUTOR:');
    timings.tutor.forEach(t => console.log('  ' + t));
    console.log('\n🟩 STUDENT:');
    timings.student.forEach(t => console.log('  ' + t));

    console.log('\n💡 Test complete. Browsers will stay open for 10s...');
    await sleep(10000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);
