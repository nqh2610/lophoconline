import puppeteer from 'puppeteer';

console.log('🧪 COMPREHENSIVE TEST: Virtual Background (After Performance Fixes)\n');

(async () => {
  let browser, page;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security', // Allow CORS for Unsplash
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Log all console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[VirtualBG]') || text.includes('MediaPipe')) {
        console.log('💬', text);
      }
    });

    const roomId = `test-vbg-fixed-${Date.now()}`;
    const url = `http://localhost:3001/test-videolify?room=${roomId}&testUserId=1&name=Tester&role=tutor`;
    
    console.log(`📌 URL: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 4000));

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 TEST 1: BLUR MODE (check if person is sharp, background blurred)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click Blur
    await page.click('[data-testid="vbg-mode-blur"]');
    console.log('   Clicked BLUR button');
    console.log('   Waiting for button to turn blue (polling)...\n');

    // Wait for button to turn blue
    try {
      await page.waitForFunction(() => {
        const btn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
        const style = window.getComputedStyle(btn);
        return style.backgroundColor === 'rgb(37, 99, 235)';
      }, { timeout: 8000 });
      console.log('   ✅ Button turned blue (VBG activated)\n');
    } catch (e) {
      console.log('   ❌ Button did NOT turn blue (timeout)\n');
    }

    console.log('   ⏸️  Pausing 8 seconds - CHECK VISUALLY:');
    console.log('      • Person should be SHARP (clear)');
    console.log('      • Background should be BLURRED');
    console.log('      • No lag/stuttering\n');
    await new Promise(resolve => setTimeout(resolve, 8000));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 TEST 2: PRESET BACKGROUND - Nature');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Re-open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click Nature preset
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
      console.log('   ✅ Nature preset clicked');
      console.log('   Waiting for background to load...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('   ⏸️  Pausing 8 seconds - CHECK VISUALLY:');
      console.log('      • Person should be visible (sharp)');
      console.log('      • Background should be Nature image from Unsplash');
      console.log('      • Edges should be clean (no ugly artifacts)');
      console.log('      • No lag/stuttering\n');
      await new Promise(resolve => setTimeout(resolve, 8000));
    } else {
      console.log('   ❌ Nature button not found\n');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 TEST 3: PERFORMANCE CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const metrics = await page.evaluate(() => {
      return {
        fps: 'Check visually - should be 30fps',
        lag: 'Check visually - should be smooth',
      };
    });

    console.log('   Visual checks (look at browser):');
    console.log('   • Video smooth? (30fps expected)');
    console.log('   • No stuttering/freezing?');
    console.log('   • Person edges clean?\n');

    console.log('   ⏸️  Pausing 5 seconds for final check...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 TEST 4: DISABLE VBG (return to normal)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Re-open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click None
    await page.click('[data-testid="vbg-mode-none"]');
    console.log('   Clicked NONE (disable VBG)');

    // Wait for button to turn gray
    try {
      await page.waitForFunction(() => {
        const btn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
        const style = window.getComputedStyle(btn);
        return style.backgroundColor === 'rgb(55, 65, 81)'; // gray-700
      }, { timeout: 3000 });
      console.log('   ✅ Button turned gray (VBG disabled)\n');
    } catch (e) {
      console.log('   ❌ Button did NOT turn gray\n');
    }

    console.log('   ⏸️  Pausing 3 seconds - check original video restored...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('SUMMARY:');
    console.log('1. Blur should NOT blur person (only background)');
    console.log('2. Preset backgrounds should load and look good');
    console.log('3. Performance should be smooth (no lag)');
    console.log('4. Disable should restore original video\n');

    console.log('Browser will close in 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
})();
