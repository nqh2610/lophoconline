#!/usr/bin/env node
/**
 * MEDIA COMBINATIONS STABILITY TEST
 * Test all combinations of camera/mic on 2 different browsers
 * 
 * Test cases:
 * 1. Both with media (default)
 * 2. Toggle camera OFF after connection
 * 3. Toggle mic OFF after connection
 * 4. Toggle both OFF after connection
 * 5. Rapid toggle test
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify';

const TEST_CASES = [
  { name: 'Default - Both ON', toggles: [] },
  { name: 'Camera OFF after connect', toggles: [{ type: 'video', browser: 'both' }] },
  { name: 'Mic OFF after connect', toggles: [{ type: 'audio', browser: 'both' }] },
  { name: 'Both OFF after connect', toggles: [{ type: 'video', browser: 'both' }, { type: 'audio', browser: 'both' }] },
  { name: 'Chrome OFF, Edge ON', toggles: [{ type: 'video', browser: 'chrome' }, { type: 'audio', browser: 'chrome' }] },
];

async function testOnce(testCase, attempt) {
  const ROOM = `media-test-${Date.now()}`;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 ATTEMPT ${attempt} - ${testCase.name}`);
  console.log('='.repeat(70));

  let chromeBrowser, edgeBrowser;

  try {
    // Launch Chrome
    chromeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'chrome'
    });

    // Launch Edge
    edgeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'msedge'
    });

    const chromeContext = await chromeBrowser.newContext({
      permissions: ['camera', 'microphone']
    });

    const edgeContext = await edgeBrowser.newContext({
      permissions: ['camera', 'microphone']
    });

    const chromePage = await chromeContext.newPage();
    const edgePage = await edgeContext.newPage();

    const errors = [];
    const chromeImportantLogs = [];
    const edgeImportantLogs = [];

    // Capture errors and important logs
    chromePage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error') || text.includes('FAIL')) {
        errors.push(`🟦 CHROME: ${text.substring(0, 150)}`);
      }
      if (text.includes('P2P Connection Established') || 
          text.includes('DataChannel OPEN') ||
          text.includes('Connection healthy')) {
        chromeImportantLogs.push(text);
      }
    });

    edgePage.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error') || text.includes('FAIL')) {
        errors.push(`🟩 EDGE: ${text.substring(0, 150)}`);
      }
      if (text.includes('P2P Connection Established') || 
          text.includes('DataChannel OPEN') ||
          text.includes('Connection healthy')) {
        edgeImportantLogs.push(text);
      }
    });

    const t0 = Date.now();
    
    // Build URLs
    const chromeUrl = `${BASE_URL}?room=${ROOM}&name=Chrome&role=tutor`;
    const edgeUrl = `${BASE_URL}?room=${ROOM}&name=Edge&role=student`;
    
    // Chrome joins first
    await chromePage.goto(chromeUrl, { 
      waitUntil: 'domcontentloaded' 
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Edge joins second
    await edgePage.goto(edgeUrl, { 
      waitUntil: 'domcontentloaded' 
    });

    // Wait for connection
    let chromeConnected = false;
    let edgeConnected = false;
    
    for (let i = 0; i < 100; i++) {
      const chromeStatus = await chromePage.evaluate(() => {
        const indicator = document.querySelector('[data-testid="connection-indicator"]');
        return indicator?.getAttribute('data-connected') === 'true';
      });
      
      const edgeStatus = await edgePage.evaluate(() => {
        const indicator = document.querySelector('[data-testid="connection-indicator"]');
        return indicator?.getAttribute('data-connected') === 'true';
      });
      
      if (chromeStatus) chromeConnected = true;
      if (edgeStatus) edgeConnected = true;
      
      if (chromeConnected && edgeConnected) {
        break;
      }
      
      await new Promise(r => setTimeout(r, 200));
    }

    // Apply toggles after connection
    if (chromeConnected && edgeConnected) {
      await new Promise(r => setTimeout(r, 1000)); // Wait a bit for stable connection
      
      for (const toggle of testCase.toggles) {
        console.log(`   Toggling ${toggle.type} on ${toggle.browser}`);
        
        if (toggle.browser === 'chrome' || toggle.browser === 'both') {
          await chromePage.click(`[data-testid="toggle-${toggle.type}"]`);
        }
        
        if (toggle.browser === 'edge' || toggle.browser === 'both') {
          await edgePage.click(`[data-testid="toggle-${toggle.type}"]`);
        }
        
        await new Promise(r => setTimeout(r, 500)); // Wait between toggles
      }
      
      // Wait after toggles to check stability
      await new Promise(r => setTimeout(r, 2000));
      
      // Re-check connection after toggles
      chromeConnected = await chromePage.evaluate(() => {
        const indicator = document.querySelector('[data-testid="connection-indicator"]');
        return indicator?.getAttribute('data-connected') === 'true';
      });
      
      edgeConnected = await edgePage.evaluate(() => {
        const indicator = document.querySelector('[data-testid="connection-indicator"]');
        return indicator?.getAttribute('data-connected') === 'true';
      });
    }

    const t1 = Date.now();
    const totalTime = t1 - t0;

    // Check for important logs
    const chromeHasConnection = chromeImportantLogs.some(log => log.includes('P2P Connection Established'));
    const edgeHasConnection = edgeImportantLogs.some(log => log.includes('P2P Connection Established'));

    const success = chromeConnected && edgeConnected && chromeHasConnection && edgeHasConnection;

    if (success) {
      console.log(`✅ PASS - ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
      console.log(`   Chrome: Connected=${chromeConnected}, P2P=${chromeHasConnection}`);
      console.log(`   Edge:   Connected=${edgeConnected}, P2P=${edgeHasConnection}`);
      if (errors.length > 0) {
        console.log(`   ⚠️  ${errors.length} errors logged (non-critical)`);
      }
      return { success: true, time: totalTime, errors: errors.length };
    } else {
      console.log(`❌ FAIL - ${totalTime}ms`);
      console.log(`   Chrome: Connected=${chromeConnected}, P2P=${chromeHasConnection}`);
      console.log(`   Edge:   Connected=${edgeConnected}, P2P=${edgeHasConnection}`);
      if (errors.length > 0) {
        console.log(`   Errors:`);
        errors.slice(0, 3).forEach(e => console.log(`     ${e}`));
      }
      return { success: false, time: totalTime, errors: errors.length };
    }

  } catch (err) {
    console.log(`❌ CRASH: ${err.message}`);
    return { success: false, time: 0, crash: true, error: err.message };
  } finally {
    if (chromeBrowser) await chromeBrowser.close();
    if (edgeBrowser) await edgeBrowser.close();
  }
}

async function runMediaCombinationsTest() {
  console.log('🔬 MEDIA COMBINATIONS STABILITY TEST - Chrome ↔ Edge');
  console.log('Testing all camera/mic combinations\n');
  
  const allResults = {};

  for (const testCase of TEST_CASES) {
    console.log(`\n${'█'.repeat(70)}`);
    console.log(`📋 TEST SCENARIO: ${testCase.name}`);
    console.log('█'.repeat(70));
    
    const results = [];
    const ATTEMPTS = 5; // 5 attempts per scenario

    for (let i = 1; i <= ATTEMPTS; i++) {
      const result = await testOnce(testCase, i);
      results.push(result);
      
      // Delay between attempts
      if (i < ATTEMPTS) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Summary for this test case
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const rate = (passed / ATTEMPTS * 100).toFixed(0);
    
    console.log(`\n📊 ${testCase.name} - Summary:`);
    console.log(`   ✅ Passed: ${passed}/${ATTEMPTS} (${rate}%)`);
    console.log(`   ❌ Failed: ${failed}/${ATTEMPTS}`);
    
    if (failed > 0) {
      console.log(`   Failed attempts:`);
      results.forEach((r, i) => {
        if (!r.success) {
          console.log(`     - Attempt #${i + 1}: ${r.crash ? 'CRASH' : 'TIMEOUT'}`);
        }
      });
    }
    
    const successfulTimes = results.filter(r => r.success).map(r => r.time);
    if (successfulTimes.length > 0) {
      const avg = successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length;
      console.log(`   ⏱️  Average time: ${(avg/1000).toFixed(1)}s`);
    }

    allResults[testCase.name] = {
      passed,
      failed,
      rate: parseInt(rate),
      results
    };
  }

  // Final summary
  console.log('\n\n' + '█'.repeat(70));
  console.log('📊 FINAL SUMMARY - All Media Combinations');
  console.log('█'.repeat(70));
  
  let overallPassed = 0;
  let overallTotal = 0;
  
  for (const [name, data] of Object.entries(allResults)) {
    overallPassed += data.passed;
    overallTotal += data.passed + data.failed;
    
    const icon = data.rate === 100 ? '✅' : data.rate >= 80 ? '⚠️' : '❌';
    console.log(`${icon} ${name}: ${data.rate}% (${data.passed}/${data.passed + data.failed})`);
  }
  
  const overallRate = (overallPassed / overallTotal * 100).toFixed(0);
  console.log(`\n🎯 OVERALL STABILITY: ${overallRate}% (${overallPassed}/${overallTotal})`);
  
  if (overallRate === '100') {
    console.log('\n✅ EXCELLENT - All media combinations stable!');
  } else if (overallRate >= '80') {
    console.log('\n⚠️  NEEDS ATTENTION - Some combinations unstable');
    console.log('Check which media combinations are causing issues.');
  } else {
    console.log('\n❌ CRITICAL - Major stability issues with media handling');
    console.log('Media initialization or WebRTC connection has problems.');
  }
  
  // Identify problematic scenarios
  const problematic = Object.entries(allResults).filter(([_, data]) => data.rate < 100);
  if (problematic.length > 0) {
    console.log('\n⚠️  Problematic scenarios:');
    problematic.forEach(([name, data]) => {
      console.log(`   - ${name}: ${data.rate}%`);
    });
  }
}

runMediaCombinationsTest().catch(console.error);
