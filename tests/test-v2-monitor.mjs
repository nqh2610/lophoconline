import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting V2 Connection Monitor...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const room = `test-${Date.now()}`;
  const baseUrl = 'http://localhost:3000/test-videolify-v2';
  
  // Open Tutor page
  const tutorPage = await browser.newPage();
  const tutorLogs = [];
  tutorPage.on('console', msg => {
    const text = msg.text();
    tutorLogs.push(text);
    if (text.includes('Connection') || text.includes('ICE') || text.includes('DataChannel')) {
      console.log(`[TUTOR] ${text}`);
    }
  });
  
  console.log(`📖 Opening Tutor: ${baseUrl}?room=${room}&name=Tutor&role=tutor`);
  await tutorPage.goto(`${baseUrl}?room=${room}&name=Tutor&role=tutor`, { waitUntil: 'networkidle' });
  
  // Wait 3 seconds
  await new Promise(r => setTimeout(r, 3000));
  
  // Open Student page
  const studentPage = await browser.newPage();
  const studentLogs = [];
  studentPage.on('console', msg => {
    const text = msg.text();
    studentLogs.push(text);
    if (text.includes('Connection') || text.includes('ICE') || text.includes('DataChannel')) {
      console.log(`[STUDENT] ${text}`);
    }
  });
  
  console.log(`📖 Opening Student: ${baseUrl}?room=${room}&name=Student&role=student\n`);
  await studentPage.goto(`${baseUrl}?room=${room}&name=Student&role=student`, { waitUntil: 'networkidle' });
  
  // Wait 15 seconds for connection
  console.log('⏳ Waiting 15 seconds for connection...\n');
  await new Promise(r => setTimeout(r, 15000));
  
  // Check connection status
  console.log('\n📊 FINAL STATUS CHECK:\n');
  
  const tutorConnected = tutorLogs.some(log => log.includes('Connection state: connected'));
  const studentConnected = studentLogs.some(log => log.includes('Connection state: connected'));
  
  console.log(`Tutor Connected: ${tutorConnected ? '✅ YES' : '❌ NO'}`);
  console.log(`Student Connected: ${studentConnected ? '✅ YES' : '❌ NO'}`);
  
  if (tutorConnected && studentConnected) {
    console.log('\n✅ CONNECTION SUCCESS! Both peers connected.\n');
  } else {
    console.log('\n❌ CONNECTION FAILED!\n');
    console.log('Tutor logs:');
    tutorLogs.forEach(log => console.log(`  ${log}`));
    console.log('\nStudent logs:');
    studentLogs.forEach(log => console.log(`  ${log}`));
  }
  
  // Keep browser open for inspection
  console.log('🔍 Browser will stay open for 30 seconds for inspection...');
  await new Promise(r => setTimeout(r, 30000));
  
  await browser.close();
})();
