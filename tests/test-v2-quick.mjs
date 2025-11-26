import { chromium } from 'playwright';

console.log('🤖 AUTO TEST - Bạn không cần làm gì!\n');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `auto-${Date.now()}`;
  const url = 'http://localhost:3000/test-videolify-v2';
  
  console.log('Opening Tutor...');
  const tutorPage = await browser.newPage();
  const tutorLogs = [];
  tutorPage.on('console', msg => tutorLogs.push(msg.text()));
  
  try {
    await tutorPage.goto(`${url}?room=${room}&name=Tutor&role=tutor`, { timeout: 15000 });
  } catch (e) {
    console.log('Tutor page loaded (timeout ignored)');
  }
  
  await new Promise(r => setTimeout(r, 4000));
  
  console.log('Opening Student...');
  const studentPage = await browser.newPage();
  const studentLogs = [];
  studentPage.on('console', msg => studentLogs.push(msg.text()));
  
  try {
    await studentPage.goto(`${url}?room=${room}&name=Student&role=student`, { timeout: 15000 });
  } catch (e) {
    console.log('Student page loaded (timeout ignored)');
  }
  
  console.log('\nWaiting 12 seconds for connection...\n');
  await new Promise(r => setTimeout(r, 12000));
  
  // Check connection
  const tutorConnected = tutorLogs.some(log => log.includes('Connection state: connected'));
  const studentConnected = studentLogs.some(log => log.includes('Connection state: connected'));
  
  console.log('='.repeat(60));
  console.log('\n📊 RESULTS:\n');
  console.log(`  Tutor: ${tutorConnected ? '✅ Connected' : '❌ Not connected'}`);
  console.log(`  Student: ${studentConnected ? '✅ Connected' : '❌ Not connected'}`);
  
  // Check DataChannels
  const chat = studentLogs.some(log => log.includes('DataChannel received: chat'));
  const whiteboard = studentLogs.some(log => log.includes('DataChannel received: whiteboard'));
  const control = studentLogs.some(log => log.includes('DataChannel received: control'));
  const file = studentLogs.some(log => log.includes('DataChannel received: file'));
  
  console.log(`\n  Chat channel: ${chat ? '✅' : '❌'}`);
  console.log(`  Whiteboard channel: ${whiteboard ? '✅' : '❌'}`);
  console.log(`  Control channel: ${control ? '✅' : '❌'}`);
  console.log(`  File channel: ${file ? '✅' : '❌'}`);
  
  const success = tutorConnected && studentConnected && chat && whiteboard && control && file;
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n${success ? '🎉 SUCCESS! V2 works perfectly!' : '❌ FAILED - Connection issues'}\n`);
  
  console.log('Browser stays open for 20 seconds for you to inspect...\n');
  await new Promise(r => setTimeout(r, 20000));
  
  await browser.close();
  console.log('✅ Test complete!\n');
  
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
