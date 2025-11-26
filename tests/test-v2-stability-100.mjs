#!/usr/bin/env node
/**
 * STABILITY TEST V2 - Run 100 fresh connections to test 100% success rate
 * Tests VideolifyFull_v2 with the PC creation fix
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify-v2';
const TOTAL_TESTS = 100;

async function testOnce(attempt) {
  const ROOM = `stability-v2-${Date.now()}`;
  
  if (attempt % 10 === 0 || attempt === 1) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ATTEMPT ${attempt}/${TOTAL_TESTS}`);
    console.log('='.repeat(60));
  }

  const browser = await chromium.launch({ 
    headless: true, // Headless for speed
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ]
  });

  try {
    const context = await browser.newContext({
      permissions: ['camera', 'microphone']
    });

    const tutorPage = await context.newPage();
    const studentPage = await context.newPage();

    const errors = [];
    const warnings = [];

    // Capture errors
    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('❌')) {
        errors.push(`TUTOR: ${text}`);
      } else if (text.includes('WARN') || text.includes('⚠️')) {
        warnings.push(`TUTOR: ${text}`);
      }
    });

    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('❌')) {
        errors.push(`STUDENT: ${text}`);
      } else if (text.includes('WARN') || text.includes('⚠️')) {
        warnings.push(`STUDENT: ${text}`);
      }
    });

    const t0 = Date.now();
    
    // Open tutor page
    await tutorPage.goto(`${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor&testUserId=1`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for tutor to initialize
    await new Promise(r => setTimeout(r, 3000));
    
    // Open student page
    await studentPage.goto(`${BASE_URL}?room=${ROOM}&name=Student&role=student&testUserId=2`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for connection - check both sides
    let tutorConnected = false;
    let studentConnected = false;
    
    for (let i = 0; i < 60; i++) {  // 12 seconds max
      const [tutorState, studentState] = await Promise.all([
        tutorPage.evaluate(() => {
          const bodyText = document.body.innerText;
          return {
            connected: bodyText.includes('connected: true') || 
                      bodyText.includes('Connection state: connected') ||
                      bodyText.includes('ICE state: connected')
          };
        }).catch(() => ({ connected: false })),
        
        studentPage.evaluate(() => {
          const bodyText = document.body.innerText;
          return {
            connected: bodyText.includes('connected: true') || 
                      bodyText.includes('Connection state: connected') ||
                      bodyText.includes('ICE state: connected')
          };
        }).catch(() => ({ connected: false }))
      ]);
      
      tutorConnected = tutorState.connected;
      studentConnected = studentState.connected;
      
      if (tutorConnected && studentConnected) {
        break;
      }
      
      await new Promise(r => setTimeout(r, 200));
    }

    const t1 = Date.now();
    const totalTime = t1 - t0;

    const connected = tutorConnected && studentConnected;

    if (connected) {
      if (attempt % 10 === 0 || attempt === 1) {
        console.log(`✅ PASS - ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
        if (errors.length > 0) {
          console.log(`⚠️  Had ${errors.length} errors`);
        }
      } else {
        process.stdout.write('✅');
      }
      return { success: true, time: totalTime, errors: errors.length, warnings: warnings.length };
    } else {
      console.log(`\n❌ FAIL - Attempt ${attempt} - Timeout after ${totalTime}ms`);
      console.log(`   Tutor connected: ${tutorConnected}`);
      console.log(`   Student connected: ${studentConnected}`);
      if (errors.length > 0) {
        console.log(`   Errors (${errors.length}):`);
        errors.slice(0, 5).forEach(e => console.log(`     ${e}`));
      }
      return { 
        success: false, 
        time: totalTime, 
        errors: errors.length, 
        warnings: warnings.length,
        tutorConnected,
        studentConnected
      };
    }

  } catch (error) {
    console.error(`\n❌ CRASH - Attempt ${attempt}:`, error.message);
    return { success: false, time: 0, errors: 0, warnings: 0, crash: true };
  } finally {
    await browser.close();
  }
}

async function runStabilityTest() {
  console.log(`\n🔬 STABILITY TEST V2 - Running ${TOTAL_TESTS} connections`);
  console.log('Testing: VideolifyFull_v2 with PC creation fix\n');
  
  // WARMUP: First attempt is always slower (cold start)
  console.log('🔥 WARMUP - First attempt (cold start)...');
  const warmup = await testOnce(0);
  if (!warmup.success) {
    console.log('⚠️  Warmup failed - server might not be ready');
  }
  console.log('✅ Warmup complete, starting real tests\n');
  await new Promise(r => setTimeout(r, 2000));
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 1; i <= TOTAL_TESTS; i++) {
    const result = await testOnce(i);
    results.push(result);
    
    // Small delay between tests
    if (i < TOTAL_TESTS) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;

  console.log('\n\n');
  console.log('='.repeat(70));
  console.log('📊 STABILITY TEST RESULTS - VIDEOLIFY V2');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withErrors = results.filter(r => r.errors > 0).length;
  const withWarnings = results.filter(r => r.warnings > 0).length;
  const crashed = results.filter(r => r.crash).length;
  
  console.log(`\n✅ Passed:        ${passed}/${TOTAL_TESTS} (${(passed/TOTAL_TESTS*100).toFixed(1)}%)`);
  console.log(`❌ Failed:        ${failed}/${TOTAL_TESTS} (${(failed/TOTAL_TESTS*100).toFixed(1)}%)`);
  console.log(`💥 Crashed:       ${crashed}/${TOTAL_TESTS}`);
  console.log(`⚠️  With errors:   ${withErrors}/${TOTAL_TESTS}`);
  console.log(`⚠️  With warnings: ${withWarnings}/${TOTAL_TESTS}`);
  
  // Show failed attempts details
  if (failed > 0) {
    console.log(`\n❌ Failed attempts:`);
    const failedAttempts = results
      .map((r, i) => ({ attempt: i + 1, ...r }))
      .filter(r => !r.success);
    
    failedAttempts.slice(0, 10).forEach(r => {
      const reason = r.crash ? 'CRASH' : 
                    !r.tutorConnected && !r.studentConnected ? 'Both timeout' :
                    !r.tutorConnected ? 'Tutor timeout' :
                    !r.studentConnected ? 'Student timeout' : 'Unknown';
      console.log(`  - Attempt #${r.attempt}: ${reason} (${(r.time/1000).toFixed(1)}s)`);
    });
    
    if (failedAttempts.length > 10) {
      console.log(`  ... and ${failedAttempts.length - 10} more`);
    }
  }
  
  if (passed > 0) {
    const times = results.filter(r => r.success).map(r => r.time);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const medianTime = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
    
    console.log(`\n⏱️  Connection Timing:`);
    console.log(`  Average:  ${(avgTime/1000).toFixed(2)}s`);
    console.log(`  Median:   ${(medianTime/1000).toFixed(2)}s`);
    console.log(`  Min:      ${(minTime/1000).toFixed(2)}s`);
    console.log(`  Max:      ${(maxTime/1000).toFixed(2)}s`);
    console.log(`  Range:    ${((maxTime - minTime)/1000).toFixed(2)}s`);
  }

  console.log(`\n⏰ Total test duration: ${(totalDuration/60).toFixed(1)} minutes`);
  console.log(`   Average per test: ${(totalDuration/TOTAL_TESTS).toFixed(1)}s`);

  console.log(`\n🎯 STABILITY RATE: ${(passed/TOTAL_TESTS*100).toFixed(2)}%`);
  
  // Final verdict
  console.log('\n' + '='.repeat(70));
  if (passed === TOTAL_TESTS) {
    console.log('✅✅✅ PERFECT - 100% CONNECTION SUCCESS! ✅✅✅');
    console.log('All connections established successfully. V2 is STABLE!');
  } else if (passed >= TOTAL_TESTS * 0.95) {
    console.log('✅ EXCELLENT - 95%+ success rate');
    console.log('Very stable, minor issues may need attention.');
  } else if (passed >= TOTAL_TESTS * 0.90) {
    console.log('✅ GOOD - 90%+ success rate');
    console.log('Mostly stable, some edge cases need fixing.');
  } else if (passed >= TOTAL_TESTS * 0.80) {
    console.log('⚠️  ACCEPTABLE - 80%+ success rate');
    console.log('Works but has consistency issues. Needs improvement.');
  } else {
    console.log('❌ UNSTABLE - Below 80% success rate');
    console.log('Connection not reliable. Critical bugs need fixing.');
    console.log('Race conditions, timing issues, or state management problems likely.');
  }
  console.log('='.repeat(70));
  
  // Save detailed results
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: TOTAL_TESTS,
    passed,
    failed,
    crashed,
    successRate: (passed/TOTAL_TESTS*100).toFixed(2) + '%',
    timing: passed > 0 ? {
      average: (times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(2) + 's',
      min: (Math.min(...times) / 1000).toFixed(2) + 's',
      max: (Math.max(...times) / 1000).toFixed(2) + 's',
    } : null,
    failedAttempts: results
      .map((r, i) => ({ attempt: i + 1, ...r }))
      .filter(r => !r.success)
      .map(r => ({
        attempt: r.attempt,
        time: (r.time/1000).toFixed(1) + 's',
        crash: r.crash || false,
        tutorConnected: r.tutorConnected !== undefined ? r.tutorConnected : false,
        studentConnected: r.studentConnected !== undefined ? r.studentConnected : false,
      }))
  };
  
  const fs = await import('fs/promises');
  await fs.writeFile('test-v2-stability-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: test-v2-stability-report.json');
}

runStabilityTest().catch(console.error);
