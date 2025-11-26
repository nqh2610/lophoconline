import puppeteer from 'puppeteer';

(async () => {
  console.log('🔍 MANUAL TEST: Virtual Background (với timing đúng)\n');

  let browser, page;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Log tất cả console messages
    page.on('console', msg => {
      console.log('💬', msg.text());
    });

    // Navigate
    const roomId = `test-vbg-${Date.now()}`;
    const url = `http://localhost:3001/test-videolify?room=${roomId}&testUserId=1&name=Tester&role=tutor`;
    
    console.log(`📌 Opening: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📌 STEP 1: Open menu');
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('');

    console.log('📌 STEP 2: Click BLUR (đợi state update với polling)');
    await page.click('[data-testid="vbg-mode-blur"]');
    console.log('   Waiting for button to turn blue...\n');
    
    // Poll until button turns blue (max 10 seconds)
    const blurStatus = await page.waitForFunction(() => {
      const btn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
      const computedStyle = window.getComputedStyle(btn);
      return computedStyle.backgroundColor === 'rgb(37, 99, 235)'; // blue-600
    }, { timeout: 10000 }).then(async () => {
      return await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
        const computedStyle = window.getComputedStyle(btn);
        return {
          hasBlueClass: btn?.classList.contains('bg-blue-600'),
          backgroundColor: computedStyle.backgroundColor,
          allClasses: btn?.className,
        };
      });
    }).catch(() => ({
      hasBlueClass: false,
      backgroundColor: 'timeout',
      allClasses: 'timeout'
    }));
    
    console.log(`\n   Button classes: ${blurStatus.allClasses}`);
    console.log(`   Has bg-blue-600 class: ${blurStatus.hasBlueClass ? '✅ YES' : '❌ NO'}`);
    console.log(`   Computed backgroundColor: ${blurStatus.backgroundColor}`);
    
    const isBlue = blurStatus.backgroundColor === 'rgb(37, 99, 235)'; // Tailwind blue-600
    console.log(`   Button is actually blue: ${isBlue ? '✅ YES' : '❌ NO'}\n`);

    console.log('📌 STEP 3: Check local video (có blur không?)');
    console.log('   Look at the browser window - do you see blur effect?\n');

    console.log('⏸️  Pausing 10 seconds for manual check...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n📌 STEP 4: Test preset (Beach)');
    
    // Re-open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const beachBtn = buttons.find(btn => btn.textContent?.includes('Beach'));
      if (beachBtn) beachBtn.click();
    });
    
    console.log('   Beach preset clicked - waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('   Check if beach background is visible\n');

    console.log('⏸️  Pausing 10 seconds for manual check...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n✅ Manual test complete!');
    console.log('Browser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
})();
