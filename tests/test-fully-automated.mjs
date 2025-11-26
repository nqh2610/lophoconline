#!/usr/bin/env node
/**
 * FULLY AUTOMATED TEST - Zero manual intervention
 * Tự động: start server → test → report → cleanup
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const ROOM = 'auto-' + Date.now();
const SERVER_START_TIMEOUT = 45000; // 45 seconds
const TEST_TIMEOUT = 20000; // 20 seconds

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg, color = 'reset') {
  console.log(`${c[color]}${msg}${c.reset}`);
}

function logStep(step, msg) {
  log(`\n${c.bright}[${step}]${c.reset} ${msg}`, 'cyan');
}

// Check server health
async function isServerHealthy() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/api/health`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404); // 404 is OK (route may not exist)
    }).on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check any response from server
async function isServerResponding() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start development server
async function startDevServer() {
  logStep('1/5', 'Starting development server...');
  
  return new Promise((resolve, reject) => {
    // Kill any existing node processes first
    log('  🔪 Killing existing node processes...', 'yellow');
    
    const killCmd = process.platform === 'win32' 
      ? ['taskkill', ['/F', '/IM', 'node.exe']]
      : ['pkill', ['-9', 'node']];
    
    spawn(killCmd[0], killCmd[1], { shell: false }).on('close', (code) => {
      if (code === 0 || code === 128) {
        log('  ✅ Cleaned up existing processes', 'green');
      } else {
        log('  ⚠️  No processes to kill (OK)', 'yellow');
      }
      
      // Wait a bit before starting new server
      setTimeout(() => {
        log('  🚀 Spawning: npm run dev', 'blue');
        
        const serverProcess = spawn('npm', ['run', 'dev'], {
          shell: true,
          cwd: __dirname,
          env: { ...process.env, FORCE_COLOR: '1' }
        });

        let output = '';
        const timeout = setTimeout(() => {
          serverProcess.kill('SIGKILL');
          reject(new Error('Server startup timeout after 45 seconds'));
        }, SERVER_START_TIMEOUT);

        serverProcess.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          
          // Show server output
          if (text.includes('▲') || text.includes('Ready') || text.includes('Starting')) {
            process.stdout.write(`  ${c.blue}${text.trim()}${c.reset}\n`);
          }
          
          // Check if server is ready
          if (text.includes('Ready in')) {
            clearTimeout(timeout);
            log('  ✅ Server started!', 'green');
            
            // Wait a bit more for server to fully initialize
            setTimeout(async () => {
              const responding = await isServerResponding();
              if (responding) {
                log('  ✅ Server is responding', 'green');
                resolve(serverProcess);
              } else {
                log('  ⚠️  Server started but not responding yet, waiting...', 'yellow');
                setTimeout(async () => {
                  const recheckResponding = await isServerResponding();
                  if (recheckResponding) {
                    log('  ✅ Server is now responding', 'green');
                    resolve(serverProcess);
                  } else {
                    serverProcess.kill('SIGKILL');
                    reject(new Error('Server not responding after startup'));
                  }
                }, 3000);
              }
            }, 2000);
          }
        });

        serverProcess.stderr.on('data', (data) => {
          const text = data.toString();
          if (!text.includes('ExperimentalWarning')) {
            process.stderr.write(`  ${c.yellow}${text}${c.reset}`);
          }
        });

        serverProcess.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        serverProcess.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            clearTimeout(timeout);
            reject(new Error(`Server exited with code ${code}`));
          }
        });
      }, 1000);
    });
  });
}

// Run the actual test
async function runDeviceSwitchTest() {
  logStep('2/5', 'Launching browser for testing...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
  });
  
  try {
    const context = await browser.newContext({ viewport: null });
    const results = {
      user1Connected: false,
      user2Dev1Connected: false,
      user2Dev2Connected: false,
      alertReceived: false,
      alertMessage: null,
      page2Closed: false,
      testPassed: false
    };

    logStep('3/5', 'Simulating device switch scenario...');

    // USER 1: Join room
    log('  👤 User1 joining room...', 'blue');
    const page1 = await context.newPage();
    try {
      await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=User1`, {
        timeout: 10000,
        waitUntil: 'domcontentloaded'
      });
      results.user1Connected = true;
      log('  ✅ User1 connected', 'green');
    } catch (err) {
      log(`  ❌ User1 failed: ${err.message}`, 'red');
      throw err;
    }

    await new Promise(r => setTimeout(r, 1500));

    // USER 2 DEVICE 1: Join room
    log('  👤 User2-Device1 joining room...', 'blue');
    const page2 = await context.newPage();
    
    // Capture console logs from page2
    const page2Logs = [];
    page2.on('console', msg => {
      const text = msg.text();
      page2Logs.push(text);
      if (text.includes('peer-replaced') || text.includes('DEVICE SWITCH')) {
        log(`    📝 [Page2]: ${text}`, 'magenta');
      }
    });
    
    // Listen for alert dialog
    page2.on('dialog', async dialog => {
      results.alertMessage = dialog.message();
      results.alertReceived = true;
      log(`    🚨 ALERT RECEIVED: "${results.alertMessage}"`, 'yellow');
      await dialog.accept();
    });

    try {
      await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=User2-Dev1`, {
        timeout: 10000,
        waitUntil: 'domcontentloaded'
      });
      results.user2Dev1Connected = true;
      log('  ✅ User2-Device1 connected', 'green');
    } catch (err) {
      log(`  ❌ User2-Device1 failed: ${err.message}`, 'red');
      throw err;
    }

    await new Promise(r => setTimeout(r, 2000));

    // USER 2 DEVICE 2: Join with SAME userId (TRIGGER DEVICE SWITCH)
    log('  🔄 User2-Device2 joining (SAME userId=200 - should trigger device switch)...', 'yellow');
    const page3 = await context.newPage();
    
    const page3Logs = [];
    page3.on('console', msg => {
      const text = msg.text();
      page3Logs.push(text);
      if (text.includes('peer-replaced') || text.includes('DEVICE SWITCH')) {
        log(`    📝 [Page3]: ${text}`, 'magenta');
      }
    });

    try {
      await page3.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=User2-Dev2`, {
        timeout: 10000,
        waitUntil: 'domcontentloaded'
      });
      results.user2Dev2Connected = true;
      log('  ✅ User2-Device2 connected', 'green');
    } catch (err) {
      log(`  ❌ User2-Device2 failed: ${err.message}`, 'red');
      throw err;
    }

    // Wait for peer-replaced events to propagate
    log('  ⏳ Waiting 4 seconds for device switch detection...', 'blue');
    await new Promise(r => setTimeout(r, 4000));

    // Check if page2 was closed or disconnected
    results.page2Closed = page2.isClosed();

    logStep('4/5', 'Analyzing test results...');

    // Analyze logs
    const page2HasPeerReplaced = page2Logs.some(l => 
      l.includes('peer-replaced') || 
      l.includes('Bạn đã đăng nhập') ||
      l.includes('Peer replaced event')
    );

    log('\n  📊 Test Results:', 'cyan');
    log('  ' + '='.repeat(60), 'cyan');
    
    log(`  ✓ User1 connected: ${results.user1Connected ? '✅ PASS' : '❌ FAIL'}`, 
        results.user1Connected ? 'green' : 'red');
    
    log(`  ✓ User2-Device1 connected: ${results.user2Dev1Connected ? '✅ PASS' : '❌ FAIL'}`, 
        results.user2Dev1Connected ? 'green' : 'red');
    
    log(`  ✓ User2-Device2 connected: ${results.user2Dev2Connected ? '✅ PASS' : '❌ FAIL'}`, 
        results.user2Dev2Connected ? 'green' : 'red');
    
    log(`  ✓ Device switch alert: ${results.alertReceived ? '✅ PASS' : '❌ FAIL'}`, 
        results.alertReceived ? 'green' : 'red');
    
    if (results.alertMessage) {
      log(`    Message: "${results.alertMessage}"`, 'yellow');
    }

    log(`  ✓ Old device kicked: ${results.page2Closed || page2HasPeerReplaced ? '✅ PASS' : '⚠️  PARTIAL'}`, 
        results.page2Closed || page2HasPeerReplaced ? 'green' : 'yellow');

    // Determine overall pass/fail
    const criticalPassed = 
      results.user1Connected &&
      results.user2Dev1Connected &&
      results.user2Dev2Connected &&
      results.alertReceived;

    results.testPassed = criticalPassed;

    log('\n  ' + '='.repeat(60), 'cyan');
    if (results.testPassed) {
      log(`  🎉 ${c.bright}TEST PASSED!${c.reset}`, 'green');
      log('  ✅ Device switch detection working correctly!', 'green');
    } else {
      log('  ⚠️  TEST FAILED', 'red');
      if (!results.alertReceived) {
        log('  ❌ Critical: Device switch alert not received', 'red');
      }
    }

    // Keep browser open for inspection
    log('\n  👀 Keeping browser open for 5 seconds for visual inspection...', 'blue');
    await new Promise(r => setTimeout(r, 5000));

    return results;

  } finally {
    await browser.close();
    log('  ✅ Browser closed', 'green');
  }
}

// Main execution
async function main() {
  log('\n' + '='.repeat(70), 'cyan');
  log(`${c.bright}  FULLY AUTOMATED TEST: Device Switch Detection${c.reset}`, 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  let serverProcess = null;
  let testResults = null;

  try {
    // Step 1: Start server
    serverProcess = await startDevServer();

    // Step 2-4: Run test
    testResults = await runDeviceSwitchTest();

    // Step 5: Cleanup
    logStep('5/5', 'Cleanup...');
    
    if (serverProcess) {
      log('  🛑 Stopping development server...', 'yellow');
      serverProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 1000));
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      log('  ✅ Server stopped', 'green');
    }

    // Final summary
    log('\n' + '='.repeat(70), 'cyan');
    log(`${c.bright}  FINAL RESULT${c.reset}`, 'cyan');
    log('='.repeat(70), 'cyan');

    if (testResults && testResults.testPassed) {
      log(`\n  🎉 ${c.bright}${c.green}ALL TESTS PASSED!${c.reset}\n`, 'green');
      log('  ✅ Device switch detection is working correctly', 'green');
      log('  ✅ Old device receives kick notification', 'green');
      log('  ✅ New device connects successfully', 'green');
      return 0;
    } else {
      log(`\n  ❌ ${c.bright}${c.red}TEST FAILED${c.reset}\n`, 'red');
      if (testResults) {
        if (!testResults.alertReceived) {
          log('  • Device switch alert not received', 'red');
          log('  • Check: peer-replaced event handler in VideolifyFull.tsx', 'yellow');
          log('  • Check: broadcastToRoom() in stream/route.ts', 'yellow');
        }
      }
      return 1;
    }

  } catch (error) {
    log(`\n❌ ${c.bright}TEST ERROR:${c.reset} ${error.message}`, 'red');
    
    if (error.message.includes('Connection refused')) {
      log('\n💡 Troubleshooting:', 'yellow');
      log('  • Server failed to start or crashed', 'yellow');
      log('  • Check for TypeScript compilation errors', 'yellow');
      log('  • Try running manually: npm run dev', 'yellow');
    } else if (error.message.includes('timeout')) {
      log('\n💡 Troubleshooting:', 'yellow');
      log('  • Server is taking too long to start', 'yellow');
      log('  • May be compiling or loading dependencies', 'yellow');
      log('  • Try increasing SERVER_START_TIMEOUT', 'yellow');
    }
    
    console.error('\nFull error:', error);
    return 1;

  } finally {
    // Emergency cleanup
    if (serverProcess && !serverProcess.killed) {
      try {
        serverProcess.kill('SIGKILL');
      } catch (e) {
        // Ignore
      }
    }

    log('\n✅ Test run completed\n', 'green');
  }
}

// Execute
main().then(exitCode => {
  process.exit(exitCode);
}).catch(err => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
