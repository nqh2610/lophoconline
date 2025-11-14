import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import net from 'net';

console.log('🚀 Automated Test Runner Starting...\n');

// Function to check if port is in use
async function checkPort(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('timeout'));
        });
        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
        socket.connect(port, '127.0.0.1');
      });
      
      console.log(`✅ Port ${port} is ready!`);
      return true;
    } catch (err) {
      process.stdout.write(`\r⏳ Waiting for port ${port}... Attempt ${i + 1}/${maxAttempts}`);
      await setTimeout(1000);
    }
  }
  return false;
}

// Start server
console.log('📡 Starting Next.js server...');
const serverProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'pipe',
  shell: true,
  detached: false
});

let serverReady = false;

// Capture server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Ready in')) {
    serverReady = true;
    console.log('\n✅ Server is ready!');
  }
});

serverProcess.stderr.on('data', (data) => {
  // Suppress server logs unless error
  if (data.toString().includes('Error')) {
    console.error('❌ Server error:', data.toString());
  }
});

// Wait for server
console.log('⏳ Waiting for server to start...');
const portReady = await checkPort(3000, 30);

if (!portReady) {
  console.error('\n❌ Server failed to start after 30 seconds');
  serverProcess.kill();
  process.exit(1);
}

// Extra wait for full initialization
console.log('⏳ Waiting 5 more seconds for full initialization...');
await setTimeout(5000);

// Run tests
console.log('\n🧪 Running Videolify Resilience Tests...');
console.log('='.repeat(80));

const testProcess = spawn('node', ['test-videolify-resilience.mjs'], {
  stdio: 'inherit',
  shell: true
});

// Wait for tests to complete
const testExitCode = await new Promise((resolve) => {
  testProcess.on('close', (code) => {
    resolve(code);
  });
});

// Cleanup
console.log('\n🧹 Cleaning up...');
serverProcess.kill();
await setTimeout(2000);

// Final report
console.log('\n' + '='.repeat(80));
if (testExitCode === 0) {
  console.log('🎉 ALL TESTS PASSED!');
} else {
  console.log('⚠️  SOME TESTS FAILED - Check test-report.html for details');
}
console.log('='.repeat(80));

console.log('\n📄 Test report: test-report.html');

process.exit(testExitCode);
