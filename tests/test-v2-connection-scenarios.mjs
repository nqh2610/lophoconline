#!/usr/bin/env node
/**
 * Test V2 Connection Scenarios
 * Kiểm tra các trường hợp có thể gây mất kết nối
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

const SCENARIOS = [
  {
    name: 'Network Delay',
    description: 'Giả lập delay mạng khi trao đổi ICE candidates',
    test: async (context) => {
      // Slow down network
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      await page1.route('**/*', async (route) => {
        await new Promise(r => setTimeout(r, 100)); // 100ms delay
        await route.continue();
      });
      
      return { page1, page2 };
    }
  },
  {
    name: 'Rapid Page Reload',
    description: 'F5 reload nhanh khi đang kết nối',
    test: async (context) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // Start connection then reload
      setTimeout(async () => {
        console.log('  → Reloading page1 during connection...');
        await page1.reload({ waitUntil: 'domcontentloaded' });
      }, 3000);
      
      return { page1, page2 };
    }
  },
  {
    name: 'Browser Tab Switch',
    description: 'Chuyển tab khi đang kết nối',
    test: async (context) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // Switch between tabs
      setTimeout(async () => {
        await page1.bringToFront();
        await new Promise(r => setTimeout(r, 500));
        await page2.bringToFront();
        await new Promise(r => setTimeout(r, 500));
        await page1.bringToFront();
      }, 2000);
      
      return { page1, page2 };
    }
  },
  {
    name: 'Late Joiner',
    description: 'Người thứ 2 vào sau 10 giây',
    test: async (context) => {
      const page1 = await context.newPage();
      
      // Wait 10s before page2 joins
      await new Promise(r => setTimeout(r, 10000));
      
      const page2 = await context.newPage();
      return { page1, page2 };
    }
  },
  {
    name: 'Simultaneous Join',
    description: 'Cả 2 người vào cùng lúc (race condition)',
    test: async (context) => {
      const [page1, page2] = await Promise.all([
        context.newPage(),
        context.newPage()
      ]);
      
      return { page1, page2 };
    }
  },
  {
    name: 'Permission Denied',
    description: 'Từ chối quyền camera/mic',
    test: async (context) => {
      // Create context without permissions
      const browser = context.browser();
      const restrictedContext = await browser.newContext({
        permissions: [] // No permissions
      });
      
      const page1 = await context.newPage(); // Has permissions
      const page2 = await restrictedContext.newPage(); // No permissions
      
      return { page1, page2, extraContext: restrictedContext };
    }
  },
  {
    name: 'Offer Before Join',
    description: 'Offer được gửi trước khi peer-joined event',
    test: async (context) => {
      const page1 = await context.newPage();
      
      // Minimal delay
      await new Promise(r => setTimeout(r, 100));
      
      const page2 = await context.newPage();
      return { page1, page2 };
    }
  },
  {
    name: 'Multiple ICE Restarts',
    description: 'Kết nối bị disconnect và ICE restart nhiều lần',
    test: async (context) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // Simulate network interruption
      setTimeout(async () => {
        console.log('  → Simulating network interruption...');
        await page1.route('**/api/videolify/signal', async (route) => {
          await new Promise(r => setTimeout(r, 2000));
          await route.continue();
        });
        
        setTimeout(() => {
          page1.unroute('**/api/videolify/signal');
        }, 5000);
      }, 5000);
      
      return { page1, page2 };
    }
  },
  {
    name: 'SSE Disconnect',
    description: 'SSE connection bị ngắt giữa chừng',
    test: async (context) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // Close SSE after 3s
      setTimeout(async () => {
        console.log('  → Closing SSE connection...');
        await page1.evaluate(() => {
          // Try to close EventSource
          window.dispatchEvent(new Event('beforeunload'));
        });
      }, 3000);
      
      return { page1, page2 };
    }
  },
  {
    name: 'Answer Lost',
    description: 'Answer bị mất (network drop)',
    test: async (context) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // Block answer temporarily
      let blockAnswer = false;
      setTimeout(() => {
        blockAnswer = true;
        setTimeout(() => { blockAnswer = false; }, 1000);
      }, 4000);
      
      await page2.route('**/api/videolify/signal', async (route) => {
        const postData = route.request().postData();
        if (blockAnswer && postData?.includes('"action":"answer"')) {
          console.log('  → Blocking answer...');
          await route.abort();
        } else {
          await route.continue();
        }
      });
      
      return { page1, page2 };
    }
  }
];

// Log helper
function log(msg, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARN: '\x1b[33m',
  };
  console.log(`${colors[level]}[${timestamp}] ${msg}\x1b[0m`);
}

// Start server
async function startServer() {
  log('Starting Next.js server...');
  
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.kill();
      reject(new Error('Server timeout'));
    }, 60000);

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('Local:')) {
        clearTimeout(timeout);
        setTimeout(() => resolve(server), 2000);
      }
    });

    server.on('error', reject);
  });
}

// Check connection - Look for console logs instead of DOM text
async function checkConnection(page, label, timeout = 20000) {
  try {
    // Collect console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
    });
    
    const result = await Promise.race([
      page.evaluate(() => {
        return new Promise((resolve) => {
          const start = Date.now();
          
          // Check for connection via window variable (set by component)
          const check = setInterval(() => {
            const elapsed = Date.now() - start;
            
            // Check if component logged connection
            const logs = window.__videolifyLogs || [];
            const connected = logs.some(l => 
              l.includes('Connection state: connected') || 
              l.includes('✅ Đã kết nối')
            );
            
            if (connected) {
              clearInterval(check);
              resolve({ connected: true, time: elapsed });
            }
            
            if (elapsed > 18000) {
              clearInterval(check);
              resolve({ connected: false, timeout: true, logs: logs.slice(-5) });
            }
          }, 500);
        });
      }),
      new Promise((resolve) => setTimeout(() => resolve({ connected: false, timeout: true, logs: logs.slice(-10) }), timeout))
    ]);
    
    return result;
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

// Run single scenario
async function runScenario(scenario, browser, testNum) {
  const roomId = `scenario-${testNum}-${Date.now()}`;
  
  console.log(`\n${'='.repeat(80)}`);
  log(`[${testNum}/${SCENARIOS.length}] Testing: ${scenario.name}`, 'INFO');
  log(`Description: ${scenario.description}`, 'INFO');
  console.log(`${'='.repeat(80)}`);
  
  let context = null;
  let extraContext = null;
  
  try {
    // Create context with permissions
    context = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    
    // Setup pages based on scenario
    const { page1, page2, extraContext: extra } = await scenario.test(context);
    extraContext = extra;
    
    // Setup console logging
    [page1, page2].forEach((page, idx) => {
      const label = idx === 0 ? 'PEER1' : 'PEER2';
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`  [${label}] ❌ ${msg.text()}`);
        }
      });
      page.on('pageerror', err => {
        console.log(`  [${label}] ❌ Page error: ${err.message}`);
      });
    });
    
    // Navigate to test pages
    log('Opening pages...');
    
    await page1.goto(
      `${BASE_URL}/test-videolify-v2?room=${roomId}&name=Peer1&role=tutor&testUserId=1`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    
    // Open debug stats panel
    await new Promise(r => setTimeout(r, 2000));
    await page1.click('button:has-text("🐛")').catch(() => {});
    
    // Small delay between joins (unless scenario handles it)
    if (scenario.name !== 'Simultaneous Join' && scenario.name !== 'Late Joiner') {
      await new Promise(r => setTimeout(r, 3000));
    }
    
    if (!page2._closed) {
      await page2.goto(
        `${BASE_URL}/test-videolify-v2?room=${roomId}&name=Peer2&role=student&testUserId=2`,
        { waitUntil: 'domcontentloaded', timeout: 30000 }
      );
      
      // Open debug stats panel
      await new Promise(r => setTimeout(r, 2000));
      await page2.click('button:has-text("🐛")').catch(() => {});
    }
    
    // Wait for connection
    log('Waiting for connection (max 20s)...');
    await new Promise(r => setTimeout(r, 3000));
    
    const [peer1Result, peer2Result] = await Promise.all([
      checkConnection(page1, 'PEER1'),
      page2._closed ? { connected: false, closed: true } : checkConnection(page2, 'PEER2')
    ]);
    
    // Evaluate result
    const success = peer1Result.connected && peer2Result.connected;
    
    if (success) {
      log(`✅ PASS - Both peers connected successfully`, 'SUCCESS');
      log(`   Peer1: ${peer1Result.time}ms, Peer2: ${peer2Result.time}ms`, 'SUCCESS');
    } else {
      log(`❌ FAIL - Connection failed`, 'ERROR');
      log(`   Peer1: ${JSON.stringify(peer1Result)}`, 'WARN');
      log(`   Peer2: ${JSON.stringify(peer2Result)}`, 'WARN');
      
      // Capture debug info
      const debug1 = await page1.evaluate(() => document.body.innerText.slice(-500));
      console.log('\n  Last 500 chars from Peer1:');
      console.log('  ' + debug1.replace(/\n/g, '\n  '));
      
      if (!page2._closed) {
        const debug2 = await page2.evaluate(() => document.body.innerText.slice(-500));
        console.log('\n  Last 500 chars from Peer2:');
        console.log('  ' + debug2.replace(/\n/g, '\n  '));
      }
    }
    
    return {
      scenario: scenario.name,
      success,
      peer1: peer1Result,
      peer2: peer2Result,
    };
    
  } catch (err) {
    log(`❌ FAIL - Test error: ${err.message}`, 'ERROR');
    return {
      scenario: scenario.name,
      success: false,
      error: err.message,
    };
  } finally {
    // Cleanup
    if (context) await context.close();
    if (extraContext) await extraContext.close();
  }
}

// Main test runner
async function runTests() {
  let server = null;
  let browser = null;
  
  try {
    // Start server
    server = await startServer();
    log('✅ Server started', 'SUCCESS');
    
    // Launch browser
    browser = await chromium.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    });
    
    log('✅ Browser launched', 'SUCCESS');
    
    // Run all scenarios
    const results = [];
    for (let i = 0; i < SCENARIOS.length; i++) {
      const result = await runScenario(SCENARIOS[i], browser, i + 1);
      results.push(result);
      
      // Wait between tests
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('                          TEST SUMMARY');
    console.log('='.repeat(80));
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const passRate = ((passed / results.length) * 100).toFixed(1);
    
    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Pass Rate: ${passRate}%\n`);
    
    console.log('Detailed Results:');
    results.forEach((r, i) => {
      const status = r.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${i + 1}. ${status} - ${r.scenario}`);
      if (!r.success && r.error) {
        console.log(`     Error: ${r.error}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Save results
    const fs = await import('fs/promises');
    await fs.writeFile(
      'test-v2-scenarios-results.json',
      JSON.stringify({ results, summary: { passed, failed, passRate } }, null, 2)
    );
    log('Results saved to test-v2-scenarios-results.json', 'INFO');
    
    process.exit(failed === 0 ? 0 : 1);
    
  } catch (err) {
    log(`Fatal error: ${err.message}`, 'ERROR');
    console.error(err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

// Run
runTests().catch(console.error);
