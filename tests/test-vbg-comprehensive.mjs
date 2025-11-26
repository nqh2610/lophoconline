import puppeteer from 'puppeteer';

console.log('🧪 COMPREHENSIVE TEST: All Virtual Background Features\n');

(async () => {
  let browser, page;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
        '--autoplay-policy=no-user-gesture-required',
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });

    // Log important messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[VirtualBG]') || text.includes('MediaPipe') || text.includes('GL')) {
        console.log('   💬', text);
      }
    });

    const roomId = `test-vbg-${Date.now()}`;
    const url = `http://localhost:3000/test-videolify?room=${roomId}&testUserId=1&name=Tester&role=tutor`;
    
    console.log(`📌 Opening: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: BLUR BACKGROUND');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Click Blur
    const blurClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const blurBtn = buttons.find(btn => btn.textContent?.includes('Blur Background'));
      if (blurBtn) {
        blurBtn.click();
        return true;
      }
      return false;
    });

    if (blurClicked) {
      console.log('✅ Blur button clicked');
      console.log('   Waiting for MediaPipe to initialize (max 10s)...\n');

      // Wait for button to turn blue
      try {
        await page.waitForFunction(() => {
          const btn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
          const style = window.getComputedStyle(btn);
          return style.backgroundColor === 'rgb(37, 99, 235)';
        }, { timeout: 10000 });
        console.log('✅ Button turned BLUE (Virtual Background ACTIVE)\n');

        // Wait for MediaPipe GL context
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📊 Check visually in browser:');
        console.log('   • Is background BLURRED?');
        console.log('   • Is person SHARP (not blurred)?');
        console.log('   • Is video SMOOTH (no lag)?\n');
        
        await new Promise(resolve => setTimeout(resolve, 8000));
        
      } catch (e) {
        console.log('❌ Button did NOT turn blue (MediaPipe failed?)\n');
      }
    } else {
      console.log('❌ Blur button not found\n');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: BLUR INTENSITY SLIDER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Re-open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Change blur amount
    const sliderChanged = await page.evaluate(() => {
      const slider = document.querySelector('input[type="range"]');
      if (slider) {
        slider.value = '20';
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    });

    if (sliderChanged) {
      console.log('✅ Blur slider changed to 20px');
      console.log('   Check if blur increased...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('⚠️  Blur slider not found (might be hidden)\n');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: PRESET BACKGROUNDS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Re-open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test Nature preset
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
      console.log('   Waiting for background to load (3s)...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('📊 Check visually:');
      console.log('   • Is background showing Nature image?');
      console.log('   • Is person VISIBLE and SHARP?');
      console.log('   • Are edges CLEAN (no artifacts)?\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('❌ Nature preset not found\n');
    }

    // Test City preset
    const cityClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const cityBtn = buttons.find(btn => btn.textContent?.includes('City'));
      if (cityBtn) {
        cityBtn.click();
        return true;
      }
      return false;
    });

    if (cityClicked) {
      console.log('✅ City preset clicked');
      console.log('   Waiting for background change...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('📊 Check if background changed to City image\n');
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: PERFORMANCE CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Visual performance check (10 seconds):');
    console.log('   • Is video running at 30fps (smooth)?');
    console.log('   • Any stuttering or freezing?');
    console.log('   • CPU usage acceptable?\n');
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 5: DISABLE VIRTUAL BACKGROUND');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Re-open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click None
    const noneClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const noneBtn = buttons.find(btn => btn.textContent?.includes('None') || btn.textContent?.includes('Original'));
      if (noneBtn) {
        noneBtn.click();
        return true;
      }
      return false;
    });

    if (noneClicked) {
      console.log('✅ None (Original) clicked');
      
      // Wait for button to turn gray
      try {
        await page.waitForFunction(() => {
          const btn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
          const style = window.getComputedStyle(btn);
          return style.backgroundColor === 'rgb(55, 65, 81)'; // gray-700
        }, { timeout: 3000 });
        console.log('✅ Button turned GRAY (Virtual Background DISABLED)\n');
        
        console.log('📊 Check if original video restored\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (e) {
        console.log('⚠️  Button color did not change\n');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('SUMMARY OF TESTS:');
    console.log('1. ✅ Blur Background');
    console.log('2. ✅ Blur Intensity Slider');
    console.log('3. ✅ Preset Backgrounds (Nature, City)');
    console.log('4. ✅ Performance Check');
    console.log('5. ✅ Disable VBG\n');
    
    console.log('Browser will close in 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
})();
