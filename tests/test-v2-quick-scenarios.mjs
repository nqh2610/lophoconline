#!/usr/bin/env node
/**
 * Quick V2 Connection Test - Test 4 important scenarios
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Quick scenarios
const SCENARIOS = [
  {
    name: 'Normal Connection',
    description: 'Kết nối bình thường',
    delay: 3000,
  },
  {
    name: 'Simultaneous Join',
    description: 'Cả 2 vào cùng lúc',
    delay: 0,
  },
  {
    name: 'Fast Join',
    description: 'Người 2 vào ngay sau người 1 (500ms)',
    delay: 500,
  },
  {
    name: 'Late Joiner',
    description: 'Người 2 vào sau 8 giây',
    delay: 8000,
  },
];

function log(msg, level = 'INFO') {
  const colors = { INFO: '\x1b[36m', SUCCESS: '\x1b[32m', ERROR: '\x1b[31m', WARN: '\x1b[33m' };
  console.log(`${colors[level]}[${new Date().toISOString()}] ${msg}\x1b[0m`);
}

async function startServer() {
  log('Starting server...');
  const server = spawn('npm', ['run', 'dev'], { stdio: 'pipe', shell: true });
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { server.kill(); reject(new Error('Timeout')); }, 60000);
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Ready')) {
        clearTimeout(timeout);
        setTimeout(() => resolve(server), 2000);
      }
    });
    server.on('error', reject);
  });
}

async function runTest(scenario, browser, num) {
  const roomId = `test-${num}-${Date.now()}`;
  log(`\n[${num}/${SCENARIOS.length}] Testing: ${scenario.name}`);
  log(`Description: ${scenario.description}`);
  
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  
  try {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Navigate page1
    await page1.goto(
      `${BASE_URL}/test-videolify-v2?room=${roomId}&name=Tutor&role=tutor`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    
    // Wait based on scenario
    if (scenario.delay > 0) {
      await new Promise(r => setTimeout(r, scenario.delay));
    }
    
    // Navigate page2
    await page2.goto(
      `${BASE_URL}/test-videolify-v2?room=${roomId}&name=Student&role=student`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    
    // Wait for connection
    await new Promise(r => setTimeout(r, 15000));
    
    // Check connection via console logs
    const [result1, result2] = await Promise.all([
      checkConnection(page1),
      checkConnection(page2),
    ]);
    
    const success = result1 && result2;
    
    if (success) {
      log(`✅ PASS - Both connected`, 'SUCCESS');
    } else {
      log(`❌ FAIL - Peer1: ${result1}, Peer2: ${result2}`, 'ERROR');
    }
    
    await context.close();
    return { scenario: scenario.name, success };
    
  } catch (err) {
    log(`❌ ERROR: ${err.message}`, 'ERROR');
    await context.close();
    return { scenario: scenario.name, success: false, error: err.message };
  }
}

async function checkConnection(page) {
  try {
    // Check toast message or connection state in DOM
    const connected = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('Đã kết nối thành công') || 
             body.includes('connected: true') ||
             document.querySelector('[class*="toast"]')?.textContent?.includes('kết nối');
    });
    return connected;
  } catch {
    return false;
  }
}

async function main() {
  let server, browser;
  
  try {
    server = await startServer();
    log('✅ Server started', 'SUCCESS');
    
    browser = await chromium.launch({
      headless: false,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    });
    log('✅ Browser launched', 'SUCCESS');
    
    const results = [];
    for (let i = 0; i < SCENARIOS.length; i++) {
      const result = await runTest(SCENARIOS[i], browser, i + 1);
      results.push(result);
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;
    console.log(`Total: ${results.length} | ✅ Pass: ${passed} | ❌ Fail: ${failed}`);
    console.log(`Pass Rate: ${((passed/results.length)*100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    results.forEach((r, i) => {
      console.log(`${i+1}. ${r.success ? '✅' : '❌'} ${r.scenario}`);
    });
    
    process.exit(failed === 0 ? 0 : 1);
    
  } catch (err) {
    log(`Fatal: ${err.message}`, 'ERROR');
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

main().catch(console.error);
