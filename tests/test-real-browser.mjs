#!/usr/bin/env node
/**
 * REAL BROWSER TEST - Opens real Chrome windows
 * User just needs to ALLOW camera/mic when prompted
 */

import { chromium } from 'playwright';

const ROOM = `auto-${Date.now()}`;
const BASE_URL = 'http://localhost:3000/test-videolify';

async function runTest() {
  console.log('🧪 REAL BROWSER CONNECTION TEST');
  console.log('================================\n');
  console.log('⚠️  When browser opens, please ALLOW camera/mic permissions\n');

  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome' // Use real Chrome
  });

  try {
    // Use same context = same browser, different tabs
    const context = await browser.newContext({
      permissions: ['camera', 'microphone']
    });

    console.log('Opening 2 tabs in same browser...\n');
    const tutorPage = await context.newPage();
    const studentPage = await context.newPage();

    const logs = { tutor: [], student: [] };

    // Capture important logs
    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[TIMING]') || text.includes('P2P Connection Established') || 
          text.includes('Connected') || text.includes('ERROR')) {
        logs.tutor.push(text);
        console.log('🟦 TUTOR:', text);
      }
    });

    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[TIMING]') || text.includes('P2P Connection Established') || 
          text.includes('Connected') || text.includes('ERROR')) {
        logs.student.push(text);
        console.log('🟩 STUDENT:', text);
      }
    });

    console.log('📖 Opening Tutor page...');
    const t0 = Date.now();
    
    await tutorPage.goto(`${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor`, { 
      waitUntil: 'domcontentloaded' 
    });
    console.log('✓ Tutor page loaded\n');
    
    // Wait a bit for media to initialize
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('📖 Opening Student page...');
    await studentPage.goto(`${BASE_URL}?room=${ROOM}&name=Student&role=student`, { 
      waitUntil: 'domcontentloaded' 
    });
    console.log('✓ Student page loaded\n');

    console.log('⏳ Waiting for P2P connection...\n');

    // Check connection status every 500ms for up to 20 seconds
    let connected = false;
    let attempts = 0;
    const maxAttempts = 40; // 20 seconds

    while (attempts < maxAttempts && !connected) {
      const isConnected = await tutorPage.evaluate(() => {
        const indicator = document.querySelector('[data-testid="connection-indicator"]');
        return indicator?.getAttribute('data-connected') === 'true';
      });
      
      if (isConnected) {
        connected = true;
        break;
      }
      
      attempts++;
      await new Promise(r => setTimeout(r, 500));
    }

    const t1 = Date.now();
    const totalTime = t1 - t0;

    console.log('\n' + '='.repeat(60));
    if (connected) {
      console.log(`✅ CONNECTION SUCCESSFUL!`);
      console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
      
      if (totalTime < 4000) {
        console.log('🚀 Speed: EXCELLENT! (<4s)');
      } else if (totalTime < 6000) {
        console.log('✅ Speed: GOOD (4-6s)');
      } else if (totalTime < 10000) {
        console.log('⚠️  Speed: ACCEPTABLE (6-10s) - Could be optimized');
      } else {
        console.log('❌ Speed: SLOW (>10s) - Needs optimization');
      }
    } else {
      console.log(`❌ CONNECTION FAILED - Timeout after ${totalTime}ms`);
      console.log('Check browser console for errors');
    }
    console.log('='.repeat(60) + '\n');

    // Print timing breakdown
    console.log('📊 TIMING BREAKDOWN:');
    console.log('--------------------\n');
    
    console.log('🟦 TUTOR:');
    const tutorTimings = logs.tutor.filter(l => l.includes('[TIMING]'));
    if (tutorTimings.length > 0) {
      tutorTimings.forEach(t => console.log('  ' + t));
    } else {
      console.log('  (No timing data captured)');
    }
    
    console.log('\n🟩 STUDENT:');
    const studentTimings = logs.student.filter(l => l.includes('[TIMING]'));
    if (studentTimings.length > 0) {
      studentTimings.forEach(t => console.log('  ' + t));
    } else {
      console.log('  (No timing data captured)');
    }

    console.log('\n💡 Browsers will stay open for 30 seconds for inspection...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🔚 Closing browsers...');
    await browser.close();
    console.log('✅ Test complete!');
  }
}

runTest().catch(console.error);
