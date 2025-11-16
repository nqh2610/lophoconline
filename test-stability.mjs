#!/usr/bin/env node
/**
 * STABILITY TEST - Run multiple fresh joins to find inconsistency
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify';

async function testOnce(attempt) {
  const ROOM = `stability-${Date.now()}`;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ATTEMPT ${attempt}`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });

  try {
    const context = await browser.newContext({
      permissions: ['camera', 'microphone']
    });

    const tutorPage = await context.newPage();
    const studentPage = await context.newPage();

    const errors = [];

    // Capture errors
    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error') || text.includes('FAIL')) {
        errors.push(`🟦 TUTOR: ${text}`);
      }
    });

    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error') || text.includes('FAIL')) {
        errors.push(`🟩 STUDENT: ${text}`);
      }
    });

    const t0 = Date.now();
    
    await tutorPage.goto(`${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor`, { 
      waitUntil: 'domcontentloaded' 
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    await studentPage.goto(`${BASE_URL}?room=${ROOM}&name=Student&role=student`, { 
      waitUntil: 'domcontentloaded' 
    });

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
      await new Promise(r => setTimeout(r, 200));
    }

    const t1 = Date.now();
    const totalTime = t1 - t0;

    if (connected) {
      console.log(`✅ PASS - ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
      if (errors.length > 0) {
        console.log(`⚠️  BUT HAD ${errors.length} ERRORS:`);
        errors.forEach(e => console.log(`  ${e}`));
      }
      return { success: true, time: totalTime, errors: errors.length };
    } else {
      console.log(`❌ FAIL - Timeout after ${totalTime}ms`);
      if (errors.length > 0) {
        console.log(`Errors found:`);
        errors.forEach(e => console.log(`  ${e}`));
      }
      return { success: false, time: totalTime, errors: errors.length };
    }

  } catch (error) {
    console.error(`❌ CRASH:`, error.message);
    return { success: false, time: 0, errors: 0, crash: true };
  } finally {
    await browser.close();
  }
}

async function runStabilityTest() {
  console.log('🔬 STABILITY TEST - Running 5 fresh joins\n');
  
  const results = [];
  
  for (let i = 1; i <= 5; i++) {
    const result = await testOnce(i);
    results.push(result);
    
    // Wait 2s between tests
    if (i < 5) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n\n📊 STABILITY SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withErrors = results.filter(r => r.errors > 0).length;
  
  console.log(`✅ Passed: ${passed}/5`);
  console.log(`❌ Failed: ${failed}/5`);
  console.log(`⚠️  With errors: ${withErrors}/5`);
  
  if (passed > 0) {
    const times = results.filter(r => r.success).map(r => r.time);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`\n⏱️  Timing:`);
    console.log(`  Average: ${(avgTime/1000).toFixed(1)}s`);
    console.log(`  Min: ${(minTime/1000).toFixed(1)}s`);
    console.log(`  Max: ${(maxTime/1000).toFixed(1)}s`);
    console.log(`  Range: ${((maxTime - minTime)/1000).toFixed(1)}s`);
  }

  console.log('\n🎯 STABILITY RATE: ' + Math.round(passed/5 * 100) + '%');
  
  if (failed > 0) {
    console.log('\n⚠️  UNSTABLE - Connection not consistent!');
    console.log('Need to investigate race conditions, timing issues, or state management bugs.');
  } else if (withErrors > 0) {
    console.log('\n⚠️  WORKS BUT HAS ERRORS - Check console for warnings.');
  } else {
    console.log('\n✅ STABLE - All connections successful!');
  }
}

runStabilityTest().catch(console.error);
