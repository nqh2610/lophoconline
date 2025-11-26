import { chromium } from 'playwright';

async function setupConnection() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `test-${Date.now()}`;
  const baseUrl = 'http://localhost:3000/test-videolify-v2';
  
  const tutorPage = await browser.newPage();
  await tutorPage.goto(`${baseUrl}?room=${room}&name=Tutor&role=tutor`).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  
  const studentPage = await browser.newPage();
  await studentPage.goto(`${baseUrl}?room=${room}&name=Student&role=student`).catch(() => {});
  await new Promise(r => setTimeout(r, 8000));
  
  return { browser, tutorPage, studentPage };
}

async function checkConnection(page, name) {
  const logs = await page.evaluate(() => window.__videolifyLogs || []).catch(() => []);
  const connected = logs.some(log => log.includes('Connection state: connected'));
  console.log(`  ${name}: ${connected ? '✅ Connected' : '❌ Not connected'}`);
  return connected;
}

async function test1_NormalConnection() {
  console.log('\n📊 Test 1: Normal Connection');
  console.log('-'.repeat(60));
  
  const { browser, tutorPage, studentPage } = await setupConnection();
  
  const tutorOk = await checkConnection(tutorPage, 'Tutor');
  const studentOk = await checkConnection(studentPage, 'Student');
  
  await browser.close();
  return tutorOk && studentOk;
}

async function test2_NetworkInterruption() {
  console.log('\n📊 Test 2: Network Interruption (Offline/Online)');
  console.log('-'.repeat(60));
  
  const { browser, tutorPage, studentPage } = await setupConnection();
  
  console.log('  🔌 Going offline...');
  await tutorPage.context().setOffline(true);
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('  🔌 Going online...');
  await tutorPage.context().setOffline(false);
  await new Promise(r => setTimeout(r, 5000));
  
  const tutorOk = await checkConnection(tutorPage, 'Tutor after offline');
  
  await browser.close();
  return tutorOk;
}

async function test3_PageReload() {
  console.log('\n📊 Test 3: Page Reload (F5)');
  console.log('-'.repeat(60));
  
  const { browser, tutorPage, studentPage } = await setupConnection();
  
  console.log('  🔄 Reloading student page...');
  await studentPage.reload().catch(() => {});
  await new Promise(r => setTimeout(r, 8000));
  
  const studentOk = await checkConnection(studentPage, 'Student after reload');
  
  await browser.close();
  return studentOk;
}

async function test4_LongDurationStability() {
  console.log('\n📊 Test 4: Long Duration Stability (30 seconds)');
  console.log('-'.repeat(60));
  
  const { browser, tutorPage, studentPage } = await setupConnection();
  
  const checks = [];
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const tutorOk = await checkConnection(tutorPage, `Tutor check ${i+1}/6`);
    const studentOk = await checkConnection(studentPage, `Student check ${i+1}/6`);
    checks.push(tutorOk && studentOk);
  }
  
  const allOk = checks.every(c => c);
  console.log(`  Overall: ${allOk ? '✅ STABLE' : '❌ UNSTABLE'}`);
  
  await browser.close();
  return allOk;
}

async function test5_DataChannelIntegrity() {
  console.log('\n📊 Test 5: DataChannel Integrity');
  console.log('-'.repeat(60));
  
  const { browser, tutorPage, studentPage } = await setupConnection();
  
  const logs = await studentPage.evaluate(() => window.__videolifyLogs || []).catch(() => []);
  
  const channels = ['chat', 'whiteboard', 'control', 'file'];
  const results = channels.map(ch => {
    const exists = logs.some(log => log.includes(`DataChannel received: ${ch}`));
    console.log(`  ${ch}: ${exists ? '✅' : '❌'}`);
    return exists;
  });
  
  const allOk = results.every(r => r);
  
  await browser.close();
  return allOk;
}

(async () => {
  console.log('🔬 V2 Connection Stability Tests');
  console.log('='.repeat(60));
  
  const results = [];
  
  try {
    results.push({ name: 'Normal Connection', passed: await test1_NormalConnection() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: 'Normal Connection', passed: false });
  }
  
  try {
    results.push({ name: 'Network Interruption', passed: await test2_NetworkInterruption() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: 'Network Interruption', passed: false });
  }
  
  try {
    results.push({ name: 'Page Reload', passed: await test3_PageReload() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: 'Page Reload', passed: false });
  }
  
  try {
    results.push({ name: 'DataChannel Integrity', passed: await test5_DataChannelIntegrity() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: 'DataChannel Integrity', passed: false });
  }
  
  try {
    results.push({ name: 'Long Duration Stability', passed: await test4_LongDurationStability() });
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    results.push({ name: 'Long Duration Stability', passed: false });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log('='.repeat(60));
  
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n🎯 RESULT: ${passed}/${total} tests passed (${percentage}%)\n`);
  
  if (passed === total) {
    console.log('🎉 EXCELLENT! V2 is STABLE!\n');
  } else if (passed >= 3) {
    console.log('✅ GOOD! V2 is mostly stable.\n');
  } else {
    console.log('⚠️ WARNING! Stability issues detected.\n');
  }
})();
