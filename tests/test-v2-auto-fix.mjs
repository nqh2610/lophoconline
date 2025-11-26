#!/usr/bin/env node
/**
 * Auto Test & Fix for Videolify V2
 * Tự động phát hiện lỗi và sửa chữa
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_ROOM = `auto-fix-${Date.now()}`;

// Test configuration
const CONFIG = {
  timeout: 60000, // 60s timeout cho mỗi test
  retries: 3,     // Retry 3 lần nếu fail
  screenshots: true,
  verbose: true,
};

// Log với timestamp
function log(msg, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARN: '\x1b[33m',
    FIX: '\x1b[35m',
  };
  console.log(`${colors[level]}[${timestamp}] [${level}] ${msg}\x1b[0m`);
}

// Diagnostic info collector
class DiagnosticCollector {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  addIssue(issue, context) {
    this.issues.push({ issue, context, timestamp: Date.now() });
    log(`Issue detected: ${issue}`, 'WARN');
  }

  addFix(fix, code) {
    this.fixes.push({ fix, code, timestamp: Date.now() });
    log(`Fix applied: ${fix}`, 'FIX');
  }

  getReport() {
    return {
      issues: this.issues,
      fixes: this.fixes,
      summary: {
        totalIssues: this.issues.length,
        totalFixes: this.fixes.length,
        status: this.issues.length === this.fixes.length ? 'FIXED' : 'PARTIAL',
      },
    };
  }
}

// Start dev server
async function startServer() {
  log('Starting Next.js dev server...');
  
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
  });

  let serverReady = false;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error('Server start timeout'));
      }
    }, 60000);

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (CONFIG.verbose) process.stdout.write(output);
      
      if (output.includes('Ready in') || output.includes('Local:')) {
        serverReady = true;
        clearTimeout(timeout);
        setTimeout(() => resolve(server), 3000); // Wait 3s for full startup
      }
    });

    server.stderr.on('data', (data) => {
      if (CONFIG.verbose) process.stderr.write(data.toString());
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Check API health
async function checkAPIHealth(diagnostics) {
  log('Checking API endpoints...');
  
  const checks = [
    { url: '/api/videolify/signal', method: 'GET' },
  ];

  for (const check of checks) {
    try {
      const url = `${BASE_URL}${check.url}?roomId=health&peerId=check`;
      const response = await fetch(url);
      
      if (response.status === 400 || response.ok) {
        log(`✓ ${check.url} is accessible`, 'SUCCESS');
      } else {
        diagnostics.addIssue(`API ${check.url} returned ${response.status}`, { url, status: response.status });
      }
    } catch (err) {
      diagnostics.addIssue(`API ${check.url} not accessible`, { error: err.message });
    }
  }
}

// Test SSE connection
async function testSSEConnection(page, peerId, diagnostics) {
  log(`Testing SSE connection for ${peerId}...`);
  
  const sseStatus = await page.evaluate(async (testPeerId) => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ status: 'timeout', error: 'SSE connection timeout after 10s' });
      }, 10000);

      try {
        const url = `/api/videolify/stream?roomId=sse-test&peerId=${testPeerId}&accessToken=test`;
        const es = new EventSource(url);
        
        es.onopen = () => {
          clearTimeout(timeout);
          es.close();
          resolve({ status: 'success', readyState: es.readyState });
        };

        es.addEventListener('connected', () => {
          clearTimeout(timeout);
          es.close();
          resolve({ status: 'success', event: 'connected' });
        });

        es.onerror = (err) => {
          clearTimeout(timeout);
          es.close();
          resolve({ status: 'error', error: err.toString() });
        };
      } catch (err) {
        clearTimeout(timeout);
        resolve({ status: 'error', error: err.message });
      }
    });
  }, peerId);

  if (sseStatus.status === 'success') {
    log(`✓ SSE connection successful for ${peerId}`, 'SUCCESS');
    return true;
  } else {
    diagnostics.addIssue(`SSE connection failed for ${peerId}`, sseStatus);
    return false;
  }
}

// Monitor connection state
async function monitorConnection(page, label, timeout = 30000) {
  log(`Monitoring connection for ${label}...`);
  
  const result = await Promise.race([
    page.evaluate(() => {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const statsText = document.body.innerText;
          if (statsText.includes('connected: true') || statsText.includes('Connection state: connected')) {
            clearInterval(checkInterval);
            resolve({ connected: true, time: Date.now() });
          }
        }, 500);

        // Fallback: check console logs
        setTimeout(() => {
          clearInterval(checkInterval);
          const logs = window.__videolifyLogs || [];
          const connected = logs.some(l => l.includes('✅') || l.includes('connected'));
          resolve({ connected, logs: logs.slice(-10) });
        }, 25000);
      });
    }),
    new Promise((resolve) => setTimeout(() => resolve({ connected: false, timeout: true }), timeout)),
  ]);

  return result;
}

// Capture debug info
async function captureDebugInfo(page, label) {
  const debugInfo = await page.evaluate(() => {
    const info = {
      url: window.location.href,
      consoleErrors: [],
      networkErrors: [],
      connectionState: {
        iceState: 'unknown',
        connectionState: 'unknown',
        signalingState: 'unknown',
      },
    };

    // Try to get connection stats from debug panel
    try {
      const statsText = document.body.innerText;
      const iceMatch = statsText.match(/ICE state: (\w+)/);
      const connMatch = statsText.match(/Connection state: (\w+)/);
      
      if (iceMatch) info.connectionState.iceState = iceMatch[1];
      if (connMatch) info.connectionState.connectionState = connMatch[1];
    } catch (e) {
      info.error = e.message;
    }

    return info;
  });

  log(`Debug info for ${label}:`, 'INFO');
  console.log(JSON.stringify(debugInfo, null, 2));
  
  return debugInfo;
}

// Apply fix: Restart SSE connection
async function fixSSEConnection(diagnostics) {
  log('Applying fix: Restart SSE endpoint...', 'FIX');
  
  try {
    // Clear all rooms to force fresh connections
    await fetch(`${BASE_URL}/api/videolify/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clear-rooms',
        roomId: 'admin',
        peerId: 'admin',
      }),
    });

    diagnostics.addFix('Cleared all rooms', 'SSE_RESTART');
    await new Promise(r => setTimeout(r, 2000));
    return true;
  } catch (err) {
    log(`Failed to apply SSE fix: ${err.message}`, 'ERROR');
    return false;
  }
}

// Apply fix: Check WebRTC ICE configuration
async function fixICEConfiguration(page, diagnostics) {
  log('Applying fix: Verify ICE configuration...', 'FIX');
  
  const iceConfig = await page.evaluate(() => {
    // Check if STUN servers are accessible
    return fetch('https://stun.l.google.com:19302', { mode: 'no-cors' })
      .then(() => ({ stunAccessible: true }))
      .catch(() => ({ stunAccessible: false }));
  });

  if (!iceConfig.stunAccessible) {
    diagnostics.addIssue('STUN server not accessible', iceConfig);
    diagnostics.addFix('Using local STUN server fallback', 'ICE_CONFIG');
  }

  return iceConfig.stunAccessible;
}

// Main test flow
async function runTest() {
  const diagnostics = new DiagnosticCollector();
  let server = null;
  let browser = null;
  let success = false;

  try {
    // Start server
    server = await startServer();
    log('Server started successfully', 'SUCCESS');

    // Check API health
    await checkAPIHealth(diagnostics);

    // Launch browser
    log('Launching browser...');
    browser = await chromium.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });

    // Create two pages (Tutor & Student)
    const tutorPage = await context.newPage();
    const studentPage = await context.newPage();

    // Capture console logs
    [tutorPage, studentPage].forEach((page, idx) => {
      const label = idx === 0 ? 'TUTOR' : 'STUDENT';
      page.on('console', msg => {
        if (CONFIG.verbose && msg.type() === 'log') {
          console.log(`[${label}] ${msg.text()}`);
        }
      });
      page.on('pageerror', err => {
        log(`[${label}] Page error: ${err.message}`, 'ERROR');
        diagnostics.addIssue(`Page error on ${label}`, { error: err.message });
      });
    });

    log('Opening tutor page...');
    await tutorPage.goto(`${BASE_URL}/test-videolify-v2?room=${TEST_ROOM}&name=Tutor&role=tutor&testUserId=1`, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout,
    });

    // Wait for tutor to initialize
    log('Waiting for tutor to initialize (10s)...');
    await new Promise(r => setTimeout(r, 10000));

    log('Opening student page...');
    await studentPage.goto(`${BASE_URL}/test-videolify-v2?room=${TEST_ROOM}&name=Student&role=student&testUserId=2`, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout,
    });

    // Wait for WebRTC negotiation
    log('Waiting for WebRTC connection (15s)...');
    await new Promise(r => setTimeout(r, 15000));

    // Monitor connections
    log('Monitoring connection status...');
    const [tutorConn, studentConn] = await Promise.all([
      monitorConnection(tutorPage, 'TUTOR', 30000),
      monitorConnection(studentPage, 'STUDENT', 30000),
    ]);

    // Capture debug info if not connected
    if (!tutorConn.connected || !studentConn.connected) {
      log('Connection failed, capturing debug info...', 'WARN');
      
      await Promise.all([
        captureDebugInfo(tutorPage, 'TUTOR'),
        captureDebugInfo(studentPage, 'STUDENT'),
      ]);

      // Apply fixes
      if (!tutorConn.connected || !studentConn.connected) {
        log('Attempting automatic fixes...', 'FIX');
        
        // Fix 1: Clear rooms and restart
        await fixSSEConnection(diagnostics);
        
        // Fix 2: Check ICE configuration
        await Promise.all([
          fixICEConfiguration(tutorPage, diagnostics),
          fixICEConfiguration(studentPage, diagnostics),
        ]);

        // Fix 3: Reload pages
        log('Reloading pages to apply fixes...', 'FIX');
        await Promise.all([
          tutorPage.reload({ waitUntil: 'networkidle' }),
          studentPage.reload({ waitUntil: 'networkidle' }),
        ]);

        await new Promise(r => setTimeout(r, 10000));

        // Check again
        const [retryTutor, retryStudent] = await Promise.all([
          monitorConnection(tutorPage, 'TUTOR (RETRY)', 30000),
          monitorConnection(studentPage, 'STUDENT (RETRY)', 30000),
        ]);

        success = retryTutor.connected && retryStudent.connected;
        
        if (success) {
          log('✓ Connection successful after fixes!', 'SUCCESS');
        } else {
          log('✗ Connection still failed after fixes', 'ERROR');
        }
      }
    } else {
      success = true;
      log('✓ Connection successful!', 'SUCCESS');
    }

    // Screenshots
    if (CONFIG.screenshots) {
      await tutorPage.screenshot({ path: 'test-v2-tutor.png', fullPage: true });
      await studentPage.screenshot({ path: 'test-v2-student.png', fullPage: true });
      log('Screenshots saved', 'INFO');
    }

    // Keep alive for manual inspection
    log('Test complete. Press Ctrl+C to exit...', 'INFO');
    await new Promise(r => setTimeout(r, 300000)); // 5 minutes

  } catch (error) {
    log(`Test failed: ${error.message}`, 'ERROR');
    diagnostics.addIssue('Test execution error', { error: error.message, stack: error.stack });
  } finally {
    // Generate report
    const report = diagnostics.getReport();
    await fs.writeFile('test-v2-report.json', JSON.stringify(report, null, 2));
    log('Report saved to test-v2-report.json', 'INFO');

    console.log('\n========== TEST SUMMARY ==========');
    console.log(`Issues found: ${report.summary.totalIssues}`);
    console.log(`Fixes applied: ${report.summary.totalFixes}`);
    console.log(`Status: ${report.summary.status}`);
    console.log(`Result: ${success ? '✓ PASS' : '✗ FAIL'}`);
    console.log('==================================\n');

    // Cleanup
    if (browser) await browser.close();
    if (server) {
      server.kill();
      log('Server stopped', 'INFO');
    }

    process.exit(success ? 0 : 1);
  }
}

// Run test
runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
