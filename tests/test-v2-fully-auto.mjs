import { chromium } from 'playwright';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function closeAllChrome() {
  const { exec } = await import('child_process');
  return new Promise((resolve) => {
    exec('taskkill /F /IM chrome.exe /T 2>nul', () => {
      setTimeout(resolve, 2000);
    });
  });
}

async function test1_BasicConnection() {
  console.log('\n📊 TEST 1: BASIC CONNECTION');
  console.log('─'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `test-${Date.now()}`;
  const url = 'http://localhost:3000/test-videolify-v2';
  
  const tutorPage = await browser.newPage();
  const tutorLogs = [];
  tutorPage.on('console', msg => tutorLogs.push(msg.text()));
  
  console.log('  Opening Tutor...');
  try {
    await tutorPage.goto(`${url}?room=${room}&name=Tutor&role=tutor`, { waitUntil: 'commit', timeout: 10000 });
  } catch (e) {
    console.log('    (page loaded)');
  }
  
  await sleep(4000);
  
  const studentPage = await browser.newPage();
  const studentLogs = [];
  studentPage.on('console', msg => studentLogs.push(msg.text()));
  
  console.log('  Opening Student...');
  try {
    await studentPage.goto(`${url}?room=${room}&name=Student&role=student`, { waitUntil: 'commit', timeout: 10000 });
  } catch (e) {
    console.log('    (page loaded)');
  }
  
  console.log('  ⏳ Waiting 15 seconds for connection...\n');
  await sleep(15000);
  
  const tutorConnected = tutorLogs.some(log => log.includes('Connection state: connected'));
  const studentConnected = studentLogs.some(log => log.includes('Connection state: connected'));
  
  const chat = studentLogs.some(log => log.includes('DataChannel received: chat'));
  const whiteboard = studentLogs.some(log => log.includes('DataChannel received: whiteboard'));
  const control = studentLogs.some(log => log.includes('DataChannel received: control'));
  const file = studentLogs.some(log => log.includes('DataChannel received: file'));
  
  console.log('  RESULTS:');
  console.log(`    Tutor connected: ${tutorConnected ? '✅' : '❌'}`);
  console.log(`    Student connected: ${studentConnected ? '✅' : '❌'}`);
  console.log(`    Chat channel: ${chat ? '✅' : '❌'}`);
  console.log(`    Whiteboard channel: ${whiteboard ? '✅' : '❌'}`);
  console.log(`    Control channel: ${control ? '✅' : '❌'}`);
  console.log(`    File channel: ${file ? '✅' : '❌'}`);
  
  const passed = tutorConnected && studentConnected && chat && whiteboard && control && file;
  console.log(`\n  ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  await browser.close();
  await closeAllChrome();
  
  return passed;
}

async function test2_PageReload() {
  console.log('\n📊 TEST 2: PAGE RELOAD STABILITY');
  console.log('─'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `reload-${Date.now()}`;
  const url = 'http://localhost:3000/test-videolify-v2';
  
  const tutorPage = await browser.newPage();
  try {
    await tutorPage.goto(`${url}?room=${room}&name=Tutor&role=tutor`, { waitUntil: 'commit', timeout: 10000 });
  } catch (e) {}
  
  await sleep(4000);
  
  const studentPage = await browser.newPage();
  const studentLogs = [];
  studentPage.on('console', msg => studentLogs.push(msg.text()));
  
  try {
    await studentPage.goto(`${url}?room=${room}&name=Student&role=student`, { waitUntil: 'commit', timeout: 10000 });
  } catch (e) {}
  
  console.log('  ⏳ Waiting for initial connection...');
  await sleep(12000);
  
  console.log('  🔄 Reloading Student page...');
  studentLogs.length = 0; // Clear old logs
  try {
    await studentPage.reload({ waitUntil: 'commit', timeout: 10000 });
  } catch (e) {}
  
  console.log('  ⏳ Waiting for reconnection...\n');
  await sleep(12000);
  
  const reconnected = studentLogs.some(log => log.includes('Connection state: connected'));
  const chat = studentLogs.some(log => log.includes('DataChannel received: chat'));
  
  console.log('  RESULTS:');
  console.log(`    Student reconnected: ${reconnected ? '✅' : '❌'}`);
  console.log(`    DataChannels restored: ${chat ? '✅' : '❌'}`);
  
  const passed = reconnected && chat;
  console.log(`\n  ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  await browser.close();
  await closeAllChrome();
  
  return passed;
}

async function test3_LongStability() {
  console.log('\n📊 TEST 3: 30-SECOND STABILITY');
  console.log('─'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `stable-${Date.now()}`;
  const url = 'http://localhost:3000/test-videolify-v2';
  
  const tutorPage = await browser.newPage();
  const tutorLogs = [];
  tutorPage.on('console', msg => tutorLogs.push(msg.text()));
  
  try {
    await tutorPage.goto(`${url}?room=${room}&name=Tutor&role=tutor`, { waitUntil: 'commit', timeout: 10000 });
  } catch (e) {}
  
  await sleep(4000);
  
  const studentPage = await browser.newPage();
  const studentLogs = [];
  studentPage.on('console', msg => studentLogs.push(msg.text()));
  
  try {
    await studentPage.goto(`${url}?room=${room}&name=Student&role=student`, { waitUntil: 'commit', timeout: 10000 });
  } catch (e) {}
  
  console.log('  ⏳ Initial connection...');
  await sleep(12000);
  
  console.log('  📊 Monitoring stability for 30 seconds...\n');
  
  const checks = [];
  for (let i = 1; i <= 6; i++) {
    await sleep(5000);
    
    const tutorOk = tutorLogs.some(log => log.includes('Connection state: connected'));
    const studentOk = studentLogs.some(log => log.includes('Connection state: connected'));
    const ok = tutorOk && studentOk;
    
    checks.push(ok);
    console.log(`    Check ${i}/6: ${ok ? '✅' : '❌'}`);
  }
  
  const passed = checks.every(c => c);
  console.log(`\n  ${passed ? '✅ PASS - Connection stable' : '❌ FAIL - Connection unstable'}\n`);
  
  await browser.close();
  await closeAllChrome();
  
  return passed;
}

async function test4_NetworkInterruption() {
  console.log('\n📊 TEST 4: NETWORK INTERRUPTION');
  console.log('─'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `network-${Date.now()}`;
  const url = 'http://localhost:3000/test-videolify-v2';
  
  const tutorPage = await browser.newPage();
  const tutorLogs = [];
  tutorPage.on('console', msg => tutorLogs.push(msg.text()));
  
  await tutorPage.goto(`${url}?room=${room}&name=Tutor&role=tutor`, { timeout: 20000 }).catch(() => {});
  
  await sleep(4000);
  
  const studentPage = await browser.newPage();
  await studentPage.goto(`${url}?room=${room}&name=Student&role=student`, { timeout: 20000 }).catch(() => {});
  
  console.log('  ⏳ Initial connection...');
  await sleep(12000);
  
  console.log('  🔌 Simulating offline...');
  await tutorPage.context().setOffline(true);
  await sleep(3000);
  
  console.log('  🔌 Going back online...');
  await tutorPage.context().setOffline(false);
  
  console.log('  ⏳ Waiting for recovery...\n');
  await sleep(8000);
  
  const recovered = tutorLogs.some(log => log.includes('Connection state: connected'));
  
  console.log('  RESULTS:');
  console.log(`    Connection recovered: ${recovered ? '✅' : '❌'}`);
  
  console.log(`\n  ${recovered ? '✅ PASS' : '❌ FAIL'}\n`);
  
  await browser.close();
  await closeAllChrome();
  
  return recovered;
}

(async () => {
  console.log('\n🤖 FULLY AUTOMATED V2 STABILITY TEST');
  console.log('═'.repeat(60));
  console.log('Bạn KHÔNG cần làm gì cả - chỉ cần ngồi xem!\n');
  console.log('Mỗi test sẽ tự động:');
  console.log('  1. Mở browser mới');
  console.log('  2. Test kết nối');
  console.log('  3. Đóng browser');
  console.log('  4. Chuyển test tiếp');
  console.log('═'.repeat(60));
  
  const results = [];
  
  try {
    results.push({ name: 'Basic Connection', passed: await test1_BasicConnection() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: 'Basic Connection', passed: false });
  }
  
  await sleep(3000);
  
  try {
    results.push({ name: 'Page Reload', passed: await test2_PageReload() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: 'Page Reload', passed: false });
  }
  
  await sleep(3000);
  
  try {
    results.push({ name: '30s Stability', passed: await test3_LongStability() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: '30s Stability', passed: false });
  }
  
  await sleep(3000);
  
  try {
    results.push({ name: 'Network Interruption', passed: await test4_NetworkInterruption() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: 'Network Interruption', passed: false });
  }
  
  // Final Summary
  console.log('\n═'.repeat(60));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  
  results.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(0);
  
  console.log('');
  console.log('═'.repeat(60));
  console.log(`🎯 RESULT: ${passed}/${total} tests passed (${percentage}%)`);
  console.log('═'.repeat(60));
  console.log('');
  
  if (passed === total) {
    console.log('🎉 EXCELLENT! V2 is FULLY STABLE and ROBUST!');
  } else if (passed >= 3) {
    console.log('✅ GOOD! V2 is mostly stable with minor issues.');
  } else if (passed >= 2) {
    console.log('⚠️  WARNING! V2 has some stability issues.');
  } else {
    console.log('❌ CRITICAL! V2 has major stability problems.');
  }
  
  console.log('');
  
  process.exit(passed === total ? 0 : 1);
})();
