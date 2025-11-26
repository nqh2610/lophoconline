import puppeteer from 'puppeteer';

const ROOM = `test-room-${Date.now()}`;
const TUTOR_URL = `http://localhost:3001/test-videolify?room=${ROOM}&name=Tutor&role=tutor`;
const STUDENT_URL = `http://localhost:3001/test-videolify?room=${ROOM}&name=Student&role=student`;

const waitForLog = async (page, searchText, timeout = 10000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const logs = await page.evaluate(() => window.testLogs || []);
    if (logs.some(log => log.includes(searchText))) {
      return true;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for log: ${searchText}`);
};

const getLogs = async (page) => {
  return await page.evaluate(() => window.testLogs || []);
};

(async () => {
  const browserTutor = await puppeteer.launch({ 
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ]
  });
  
  const browserStudent = await puppeteer.launch({ 
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ]
  });

  const tutorPage = await browserTutor.newPage();
  const studentPage = await browserStudent.newPage();

  try {
    console.log('\n🧪 F5 RECONNECTION DEBUG TEST');
    console.log('Room:', ROOM);
    console.log('==================\n');

    // Step 1: Tutor joins and sets VBG
    console.log('✅ Step 1: Tutor joins...');
    await tutorPage.goto(TUTOR_URL, { waitUntil: 'networkidle2' });
    await waitForLog(tutorPage, 'Joined room successfully');
    
    console.log('✅ Step 2: Tutor selects VBG...');
    await tutorPage.evaluate(() => {
      document.querySelector('[data-testid="vbg-enable-btn"]').click();
    });
    await waitForLog(tutorPage, 'VBG enabled via UI');
    
    await tutorPage.evaluate(() => {
      document.querySelector('[data-testid="vbg-preset-0"]').click();
    });
    await waitForLog(tutorPage, 'Preset background applied');
    
    // Step 2: Student joins
    console.log('✅ Step 3: Student joins...');
    await studentPage.goto(STUDENT_URL, { waitUntil: 'networkidle2' });
    await waitForLog(studentPage, 'Joined room successfully');
    await waitForLog(studentPage, 'ICE Connection healthy', 15000);
    console.log('✅ Step 4: Initial connection OK');
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Step 3: Student F5
    console.log('\n🔄 Step 5: Student F5 now...');
    console.log('Before F5 - Tutor logs:');
    const tutorLogsBefore = await getLogs(tutorPage);
    console.log(tutorLogsBefore.filter(log => log.includes('peer-joined') || log.includes('peer-left')).slice(-5));
    
    await studentPage.reload({ waitUntil: 'networkidle2' });
    await waitForLog(studentPage, 'Joined room successfully');
    
    console.log('\n⏳ Waiting for reconnection...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Check tutor logs
    console.log('\nAfter F5 - Tutor logs:');
    const tutorLogsAfter = await getLogs(tutorPage);
    const peerEvents = tutorLogsAfter.filter(log => 
      log.includes('peer-joined') || 
      log.includes('peer-left') ||
      log.includes('ICE state') ||
      log.includes('VBG')
    );
    console.log(peerEvents.slice(-20));
    
    // Check student logs
    console.log('\nStudent logs after F5:');
    const studentLogsAfter = await getLogs(studentPage);
    const studentEvents = studentLogsAfter.filter(log => 
      log.includes('Joined room') || 
      log.includes('ICE') ||
      log.includes('VBG')
    );
    console.log(studentEvents.slice(-20));
    
    console.log('\n⏳ Waiting 30s to observe...');
    await new Promise(r => setTimeout(r, 30000));
    
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    console.log('\n✅ Test complete - browsers will stay open for inspection');
    // Don't close browsers - keep them open for manual inspection
  }
})();
