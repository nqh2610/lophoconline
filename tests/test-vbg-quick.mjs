import puppeteer from 'puppeteer';

console.log('🧪 QUICK TEST: Virtual Background Features\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[VBG]') || text.includes('MediaPipe')) {
      console.log('💬', text);
    }
  });

  const url = `http://localhost:3002/test-videolify?room=test-${Date.now()}&testUserId=1&name=Tester&role=tutor`;
  
  console.log(`Opening: ${url}\n`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: BLUR MODE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Open menu
  await page.click('[data-testid="toggle-virtual-bg-btn"]');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Click Blur
  await page.click('[data-testid="vbg-mode-blur"]');
  console.log('Clicked BLUR button\n');

  // Wait for activation
  try {
    await page.waitForFunction(() => {
      const btn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
      const style = window.getComputedStyle(btn);
      return style.backgroundColor === 'rgb(37, 99, 235)';
    }, { timeout: 10000 });
    console.log('✅ Button turned BLUE - Virtual Background ACTIVATED!\n');
  } catch (e) {
    console.log('⏰ Timeout waiting for button to turn blue\n');
  }

  console.log('⏸️  Waiting 5 seconds - CHECK BROWSER:');
  console.log('   • Is background BLURRED but person SHARP?');
  console.log('   • No lag/stuttering?\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: NATURE PRESET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Re-open menu
  await page.click('[data-testid="toggle-virtual-bg-btn"]');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Click Nature
  const natureClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const natureBtn = buttons.find(btn => btn.textContent?.includes('Nature'));
    if (natureBtn) {
      natureBtn.click();
      return true;
    }
    return false;
  });

  if (natureClicked) {
    console.log('✅ Nature preset clicked');
    console.log('   Waiting for image to load...\n');
    await new Promise(resolve => setTimeout(resolve, 4000));

    console.log('⏸️  Waiting 5 seconds - CHECK BROWSER:');
    console.log('   • Is background showing Nature image?');
    console.log('   • Person clearly visible?');
    console.log('   • Edges clean (not blurry/ugly)?\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    console.log('❌ Nature button not found\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TEST COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Browser will stay open for 10 more seconds...');
  console.log('You can test other presets manually!\n');

  await new Promise(resolve => setTimeout(resolve, 10000));

  await browser.close();
  console.log('Test finished!');
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
