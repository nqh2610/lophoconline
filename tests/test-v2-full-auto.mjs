import { spawn } from 'child_process';
import { chromium } from 'playwright';

let serverProcess = null;

async function startServer() {
  return new Promise((resolve) => {
    console.log('🚀 Starting dev server...');
    serverProcess = spawn('npm', ['run', 'dev'], { shell: true });
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started') || output.includes('3000')) {
        console.log('✅ Server ready!\n');
        resolve();
      }
    });
    
    // Fallback: resolve after 10 seconds anyway
    setTimeout(resolve, 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('\n🛑 Stopping server...');
    serverProcess.kill();
  }
}

async function testConnection() {
  console.log('📊 Test 1: Basic Connection\n');
  console.log('-'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `auto-${Date.now()}`;
  const url = 'http://localhost:3000/test-videolify-v2';
  
  // Tutor
  const tutorPage = await browser.newPage();
  const tutorLogs = [];
  tutorPage.on('console', msg => {
    const text = msg.text();
    tutorLogs.push(text);
  });
  
  console.log(`Opening Tutor...`);
  await tutorPage.goto(`${url}?room=${room}&name=Tutor&role=tutor`).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));
  
  // Student
  const studentPage = await browser.newPage();
  const studentLogs = [];
  studentPage.on('console', msg => {
    const text = msg.text();
    studentLogs.push(text);
  });
  
  console.log(`Opening Student...`);
  await studentPage.goto(`${url}?room=${room}&name=Student&role=student`).catch(() => {});
  
  console.log(`\n⏳ Waiting 10 seconds for connection...\n`);
  await new Promise(r => setTimeout(r, 10000));
  
  // Check results
  const tutorConnected = tutorLogs.some(log => log.includes('Connection state: connected'));
  const studentConnected = studentLogs.some(log => log.includes('Connection state: connected'));
  
  const chatOpen = studentLogs.some(log => log.includes('DataChannel received: chat'));
  const whiteboardOpen = studentLogs.some(log => log.includes('DataChannel received: whiteboard'));
  const controlOpen = studentLogs.some(log => log.includes('DataChannel received: control'));
  const fileOpen = studentLogs.some(log => log.includes('DataChannel received: file'));
  
  console.log('RESULTS:');
  console.log(`  Tutor connected: ${tutorConnected ? '✅' : '❌'}`);
  console.log(`  Student connected: ${studentConnected ? '✅' : '❌'}`);
  console.log(`  Chat channel: ${chatOpen ? '✅' : '❌'}`);
  console.log(`  Whiteboard channel: ${whiteboardOpen ? '✅' : '❌'}`);
  console.log(`  Control channel: ${controlOpen ? '✅' : '❌'}`);
  console.log(`  File channel: ${fileOpen ? '✅' : '❌'}`);
  
  const allGood = tutorConnected && studentConnected && chatOpen && whiteboardOpen && controlOpen && fileOpen;
  
  console.log(`\n${allGood ? '🎉 SUCCESS!' : '❌ FAILED'}\n`);
  
  console.log('Browser will stay open for 15 seconds...');
  await new Promise(r => setTimeout(r, 15000));
  
  await browser.close();
  return allGood;
}

async function testReload() {
  console.log('\n📊 Test 2: Page Reload Stability\n');
  console.log('-'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `reload-${Date.now()}`;
  const url = 'http://localhost:3000/test-videolify-v2';
  
  const tutorPage = await browser.newPage();
  await tutorPage.goto(`${url}?room=${room}&name=Tutor&role=tutor`).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  
  const studentPage = await browser.newPage();
  const studentLogs = [];
  studentPage.on('console', msg => studentLogs.push(msg.text()));
  
  await studentPage.goto(`${url}?room=${room}&name=Student&role=student`).catch(() => {});
  await new Promise(r => setTimeout(r, 8000));
  
  console.log('First connection established');
  
  // Reload student
  console.log('🔄 Reloading student page...');
  studentLogs.length = 0; // Clear logs
  await studentPage.reload().catch(() => {});
  await new Promise(r => setTimeout(r, 10000));
  
  const reconnected = studentLogs.some(log => log.includes('Connection state: connected'));
  
  console.log(`\nReconnection: ${reconnected ? '✅ SUCCESS' : '❌ FAILED'}\n`);
  
  console.log('Browser will stay open for 10 seconds...');
  await new Promise(r => setTimeout(r, 10000));
  
  await browser.close();
  return reconnected;
}

async function testStability() {
  console.log('\n📊 Test 3: 30-Second Stability\n');
  console.log('-'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `stable-${Date.now()}`;
  const url = 'http://localhost:3000/test-videolify-v2';
  
  const tutorPage = await browser.newPage();
  const tutorLogs = [];
  tutorPage.on('console', msg => tutorLogs.push(msg.text()));
  
  await tutorPage.goto(`${url}?room=${room}&name=Tutor&role=tutor`).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  
  const studentPage = await browser.newPage();
  const studentLogs = [];
  studentPage.on('console', msg => studentLogs.push(msg.text()));
  
  await studentPage.goto(`${url}?room=${room}&name=Student&role=student`).catch(() => {});
  await new Promise(r => setTimeout(r, 8000));
  
  // Check every 5 seconds for 30 seconds
  const checks = [];
  for (let i = 1; i <= 6; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    const tutorOk = tutorLogs.some(log => log.includes('Connection state: connected'));
    const studentOk = studentLogs.some(log => log.includes('Connection state: connected'));
    
    const ok = tutorOk && studentOk;
    checks.push(ok);
    console.log(`  Check ${i}/6: ${ok ? '✅' : '❌'}`);
  }
  
  const stable = checks.every(c => c);
  console.log(`\nStability: ${stable ? '✅ STABLE' : '❌ UNSTABLE'}\n`);
  
  await browser.close();
  return stable;
}

(async () => {
  console.log('🤖 FULLY AUTOMATED V2 TEST');
  console.log('='.repeat(60));
  console.log('Bạn không cần làm gì, cứ ngồi xem!\n');
  console.log('='.repeat(60) + '\n');
  
  await startServer();
  
  const results = [];
  
  try {
    results.push({ name: 'Basic Connection', passed: await testConnection() });
  } catch (e) {
    console.log(`❌ Error in test 1: ${e.message}`);
    results.push({ name: 'Basic Connection', passed: false });
  }
  
  try {
    results.push({ name: 'Page Reload', passed: await testReload() });
  } catch (e) {
    console.log(`❌ Error in test 2: ${e.message}`);
    results.push({ name: 'Page Reload', passed: false });
  }
  
  try {
    results.push({ name: '30s Stability', passed: await testStability() });
  } catch (e) {
    console.log(`❌ Error in test 3: ${e.message}`);
    results.push({ name: '30s Stability', passed: false });
  }
  
  stopServer();
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('\n🎯 FINAL RESULTS\n');
  console.log('='.repeat(60) + '\n');
  
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 ${passed}/${total} tests passed\n`);
  
  if (passed === total) {
    console.log('🎉 PERFECT! V2 is fully stable!\n');
  } else if (passed >= 2) {
    console.log('✅ GOOD! V2 is mostly working.\n');
  } else {
    console.log('⚠️ Issues detected.\n');
  }
  
  process.exit(passed === total ? 0 : 1);
})();
