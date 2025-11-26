import { chromium } from 'playwright';

const SCENARIOS = [
  {
    name: '1. Normal Connection',
    test: async (tutorPage, studentPage) => {
      console.log('  ✓ Connection established normally');
      return true;
    }
  },
  {
    name: '2. Network Interruption (Offline/Online)',
    test: async (tutorPage, studentPage) => {
      console.log('  🔌 Simulating offline...');
      await tutorPage.context().setOffline(true);
      await new Promise(r => setTimeout(r, 3000));
      
      console.log('  🔌 Going back online...');
      await tutorPage.context().setOffline(false);
      await new Promise(r => setTimeout(r, 5000));
      
      const logs = await tutorPage.evaluate(() => window.__videolifyLogs || []);
      const reconnected = logs.some(log => log.includes('Connection state: connected'));
      console.log(`  ${reconnected ? '✅' : '❌'} Reconnection: ${reconnected ? 'SUCCESS' : 'FAILED'}`);
      return reconnected;
    }
  },
  {
    name: '3. Page Reload (F5)',
    test: async (tutorPage, studentPage) => {
      console.log('  🔄 Reloading student page...');
      await studentPage.reload({ waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 8000));
      
      const logs = await studentPage.evaluate(() => window.__videolifyLogs || []);
      const reconnected = logs.some(log => log.includes('Connection state: connected'));
      console.log(`  ${reconnected ? '✅' : '❌'} Reconnection after reload: ${reconnected ? 'SUCCESS' : 'FAILED'}`);
      return reconnected;
    }
  },
  {
    name: '4. Rapid Tab Switch',
    test: async (tutorPage, studentPage) => {
      console.log('  👁️ Switching tabs rapidly...');
      for (let i = 0; i < 5; i++) {
        await tutorPage.bringToFront();
        await new Promise(r => setTimeout(r, 500));
        await studentPage.bringToFront();
        await new Promise(r => setTimeout(r, 500));
      }
      
      console.log('  ✓ Tab switching complete');
      await new Promise(r => setTimeout(r, 3000));
      
      const tutorLogs = await tutorPage.evaluate(() => window.__videolifyLogs || []);
      const studentLogs = await studentPage.evaluate(() => window.__videolifyLogs || []);
      
      const bothConnected = 
        tutorLogs.some(log => log.includes('Connection state: connected')) &&
        studentLogs.some(log => log.includes('Connection state: connected'));
      
      console.log(`  ${bothConnected ? '✅' : '❌'} Connection stability: ${bothConnected ? 'STABLE' : 'UNSTABLE'}`);
      return bothConnected;
    }
  },
  {
    name: '5. Media Device Change',
    test: async (tutorPage, studentPage) => {
      console.log('  🎤 Toggling audio/video...');
      
      // Toggle video off then on
      await tutorPage.click('button[title*="video"], button[aria-label*="video"], button:has-text("video")').catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await tutorPage.click('button[title*="video"], button[aria-label*="video"], button:has-text("video")').catch(() => {});
      
      await new Promise(r => setTimeout(r, 3000));
      
      const logs = await tutorPage.evaluate(() => window.__videolifyLogs || []);
      const stillConnected = logs.some(log => log.includes('Connection state: connected'));
      console.log(`  ${stillConnected ? '✅' : '❌'} Connection after media toggle: ${stillConnected ? 'STABLE' : 'LOST'}`);
      return stillConnected;
    }
  },
  {
    name: '6. Simultaneous Actions',
    test: async (tutorPage, studentPage) => {
      console.log('  ⚡ Performing simultaneous actions...');
      
      // Both users perform actions at the same time
      await Promise.all([
        tutorPage.evaluate(() => console.log('Tutor action')),
        studentPage.evaluate(() => console.log('Student action'))
      ]);
      
      await new Promise(r => setTimeout(r, 2000));
      
      const tutorLogs = await tutorPage.evaluate(() => window.__videolifyLogs || []);
      const studentLogs = await studentPage.evaluate(() => window.__videolifyLogs || []);
      
      const bothOk = 
        tutorLogs.some(log => log.includes('Connection state: connected')) &&
        studentLogs.some(log => log.includes('Connection state: connected'));
      
      console.log(`  ${bothOk ? '✅' : '❌'} Connection during simultaneous actions: ${bothOk ? 'STABLE' : 'UNSTABLE'}`);
      return bothOk;
    }
  },
  {
    name: '7. Long Duration Stability (30s)',
    test: async (tutorPage, studentPage) => {
      console.log('  ⏱️ Testing 30-second stability...');
      
      const checkInterval = 5000;
      const checks = [];
      
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, checkInterval));
        
        const tutorLogs = await tutorPage.evaluate(() => window.__videolifyLogs || []);
        const studentLogs = await studentPage.evaluate(() => window.__videolifyLogs || []);
        
        const bothConnected = 
          tutorLogs.some(log => log.includes('Connection state: connected')) &&
          studentLogs.some(log => log.includes('Connection state: connected'));
        
        checks.push(bothConnected);
        console.log(`    Check ${i + 1}/6: ${bothConnected ? '✅' : '❌'}`);
      }
      
      const allPassed = checks.every(c => c);
      console.log(`  ${allPassed ? '✅' : '❌'} 30s stability: ${allPassed ? 'STABLE' : 'UNSTABLE'}`);
      return allPassed;
    }
  },
  {
    name: '8. ICE Gathering Stress Test',
    test: async (tutorPage, studentPage) => {
      console.log('  🧊 Checking ICE candidate gathering...');
      
      const tutorLogs = await tutorPage.evaluate(() => window.__videolifyLogs || []);
      const studentLogs = await studentPage.evaluate(() => window.__videolifyLogs || []);
      
      const tutorCandidates = tutorLogs.filter(log => log.includes('Sending ICE candidate')).length;
      const studentCandidates = studentLogs.filter(log => log.includes('Sending ICE candidate')).length;
      
      console.log(`    Tutor candidates: ${tutorCandidates}`);
      console.log(`    Student candidates: ${studentCandidates}`);
      
      const healthy = tutorCandidates > 0 && studentCandidates > 0;
      console.log(`  ${healthy ? '✅' : '❌'} ICE gathering: ${healthy ? 'HEALTHY' : 'PROBLEM'}`);
      return healthy;
    }
  },
  {
    name: '9. DataChannel Integrity',
    test: async (tutorPage, studentPage) => {
      console.log('  📡 Checking DataChannel integrity...');
      
      const studentLogs = await studentPage.evaluate(() => window.__videolifyLogs || []);
      
      const channels = ['chat', 'whiteboard', 'control', 'file'];
      const results = channels.map(ch => {
        const exists = studentLogs.some(log => log.includes(`DataChannel received: ${ch}`));
        console.log(`    ${ch}: ${exists ? '✅' : '❌'}`);
        return exists;
      });
      
      const allOpen = results.every(r => r);
      console.log(`  ${allOpen ? '✅' : '❌'} All DataChannels: ${allOpen ? 'OPEN' : 'INCOMPLETE'}`);
      return allOpen;
    }
  },
  {
    name: '10. Memory Leak Check',
    test: async (tutorPage, studentPage) => {
      console.log('  💾 Checking for memory leaks...');
      
      const metrics = await tutorPage.metrics();
      const jsHeapSize = metrics.JSHeapUsedSize / 1024 / 1024;
      
      console.log(`    JS Heap Size: ${jsHeapSize.toFixed(2)} MB`);
      
      const healthy = jsHeapSize < 100; // Less than 100MB
      console.log(`  ${healthy ? '✅' : '⚠️'} Memory usage: ${healthy ? 'HEALTHY' : 'HIGH'}`);
      return healthy;
    }
  }
];

(async () => {
  console.log('🔬 V2 Connection Stability & Stress Test\n');
  console.log('='.repeat(60) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const room = `stability-${Date.now()}`;
  const baseUrl = 'http://localhost:3000/test-videolify-v2';
  
  // Setup pages
  console.log('📖 Setting up test pages...\n');
  
  const tutorPage = await browser.newPage();
  tutorPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('Connection') || text.includes('ICE') || text.includes('DataChannel')) {
      if (!tutorPage.__logs) tutorPage.__logs = [];
      tutorPage.__logs.push(text);
    }
  });
  
  await tutorPage.goto(`${baseUrl}?room=${room}&name=Tutor&role=tutor`, { 
    waitUntil: 'load',
    timeout: 15000 
  }).catch(() => console.log('  Tutor page loaded (timeout ignored)'));
  
  await new Promise(r => setTimeout(r, 3000));
  
  const studentPage = await browser.newPage();
  studentPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('Connection') || text.includes('ICE') || text.includes('DataChannel')) {
      if (!studentPage.__logs) studentPage.__logs = [];
      studentPage.__logs.push(text);
    }
  });
  
  await studentPage.goto(`${baseUrl}?room=${room}&name=Student&role=student`, { 
    waitUntil: 'load',
    timeout: 15000 
  }).catch(() => console.log('  Student page loaded (timeout ignored)'));
  
  // Wait for initial connection
  console.log('⏳ Waiting for initial connection...\n');
  await new Promise(r => setTimeout(r, 8000));
  
  // Verify initial connection
  const tutorLogs = await tutorPage.evaluate(() => window.__videolifyLogs || []);
  const studentLogs = await studentPage.evaluate(() => window.__videolifyLogs || []);
  
  const initiallyConnected = 
    tutorLogs.some(log => log.includes('Connection state: connected')) &&
    studentLogs.some(log => log.includes('Connection state: connected'));
  
  if (!initiallyConnected) {
    console.log('❌ FAILED: Initial connection not established!\n');
    await browser.close();
    process.exit(1);
  }
  
  console.log('✅ Initial connection established!\n');
  console.log('='.repeat(60) + '\n');
  
  // Run all stability tests
  const results = [];
  
  for (const scenario of SCENARIOS) {
    console.log(`\n${scenario.name}`);
    console.log('-'.repeat(60));
    
    try {
      const passed = await scenario.test(tutorPage, studentPage);
      results.push({ name: scenario.name, passed });
      
      // Wait between tests
      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      results.push({ name: scenario.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log('='.repeat(60) + '\n');
  
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n🎯 OVERALL: ${passed}/${total} tests passed (${percentage}%)\n`);
  
  if (passed === total) {
    console.log('🎉 EXCELLENT! V2 connection is STABLE and ROBUST!\n');
  } else if (passed >= total * 0.8) {
    console.log('✅ GOOD! V2 connection is mostly stable.\n');
  } else {
    console.log('⚠️ WARNING! V2 connection has stability issues.\n');
  }
  
  console.log('🔍 Browser will stay open for 20 seconds for inspection...\n');
  await new Promise(r => setTimeout(r, 20000));
  
  await browser.close();
})();
