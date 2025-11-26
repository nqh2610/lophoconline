import puppeteer from 'puppeteer';

console.log('🔍 VISUAL TEST: Keep browser open for manual inspection\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
    ],
    devtools: true, // Open DevTools
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', msg => console.log('💬', msg.text()));

  const url = `http://localhost:3001/test-videolify?room=manual-test-${Date.now()}&testUserId=1&name=Tester&role=tutor`;
  
  console.log(`Opening: ${url}\n`);
  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BROWSER OPENED - MANUAL TESTING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEPS TO TEST:');
  console.log('1. Click Virtual Background button (eye icon)');
  console.log('2. Click "Blur Background"');
  console.log('3. Wait 3-5 seconds for MediaPipe to load');
  console.log('4. CHECK: Is background blurred but person sharp?');
  console.log('5. Try presets: Nature, City, Beach');
  console.log('6. CHECK: Do backgrounds appear correctly?');
  console.log('7. CHECK: Is video smooth (no lag)?');
  console.log('8. Try Custom Image (upload your own)');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Press Ctrl+C to close browser and exit\n');

  // Keep running until Ctrl+C
  await new Promise(() => {});
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
