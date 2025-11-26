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

    // Capture errors AND important connection logs
    const tutorLogs = [];
    const studentLogs = [];
    
    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error') || text.includes('FAIL')) {
        errors.push(`🟦 TUTOR: ${text}`);
      }
      // Capture connection-related logs
      if (text.includes('[Videolify]') || text.includes('connectionState') || 
          text.includes('iceConnectionState') || text.includes('peer-joined')) {
        tutorLogs.push(`🟦 ${text}`);
      }
    });

    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error') || text.includes('FAIL')) {
        errors.push(`🟩 STUDENT: ${text}`);
      }
      // Capture connection-related logs
      if (text.includes('[Videolify]') || text.includes('connectionState') || 
          text.includes('iceConnectionState') || text.includes('peer-joined')) {
        studentLogs.push(`🟩 ${text}`);
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

    // Wait for connection - INCREASED TIMEOUT for cold start
    let connected = false;
    for (let i = 0; i < 100; i++) {  // Increased from 50 to 100 (20s total)
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
      return { success: true, time: totalTime, errors: errors.length, tutorLogs, studentLogs };
    } else {
      console.log(`❌ FAIL - Timeout after ${totalTime}ms`);
      if (errors.length > 0) {
        console.log(`Errors found:`);
        errors.forEach(e => console.log(`  ${e}`));
      }
      // Show connection logs for failed attempts
      console.log(`\n📋 TUTOR CONNECTION LOGS (${tutorLogs.length} entries):`);
      tutorLogs.forEach(log => console.log(`  ${log}`));
      console.log(`\n📋 STUDENT CONNECTION LOGS (${studentLogs.length} entries):`);
      studentLogs.forEach(log => console.log(`  ${log}`));
      return { success: false, time: totalTime, errors: errors.length, tutorLogs, studentLogs };
    }

  } catch (error) {
    console.error(`❌ CRASH:`, error.message);
    return { success: false, time: 0, errors: 0, crash: true, tutorLogs: [], studentLogs: [] };
  } finally {
    await browser.close();
  }
}

async function runStabilityTest() {
  console.log('🔬 STABILITY TEST - Running 10 fresh joins\n');
  
  // WARMUP: First attempt is always slower (cold start)
  console.log('🔥 WARMUP - Skipping first attempt (cold start)...');
  await testOnce(0);
  console.log('✅ Warmup complete, starting real tests\n');
  await new Promise(r => setTimeout(r, 3000));
  
  const results = [];
  
  for (let i = 1; i <= 10; i++) {
    const result = await testOnce(i);
    results.push(result);
    
    // Wait 2s between tests
    if (i < 10) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n\n📊 STABILITY SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withErrors = results.filter(r => r.errors > 0).length;
  
  console.log(`✅ Passed: ${passed}/10`);
  console.log(`❌ Failed: ${failed}/10`);
  console.log(`⚠️  With errors: ${withErrors}/10`);
  
  // Show which attempts failed
  const failedAttempts = results.map((r, i) => ({ attempt: i + 1, ...r })).filter(r => !r.success);
  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed attempts:`);
    failedAttempts.forEach(r => {
      console.log(`  - Attempt #${r.attempt}: ${r.crash ? 'CRASH' : 'TIMEOUT'} after ${(r.time/1000).toFixed(1)}s`);
    });
  }
  
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

  console.log('\n🎯 STABILITY RATE: ' + Math.round(passed/10 * 100) + '%');
  
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
