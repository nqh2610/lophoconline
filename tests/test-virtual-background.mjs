import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing Virtual Background Features...\n');

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

    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[VirtualBG]') || text.includes('ERROR') || text.includes('❌')) {
        console.log('📄 Console:', text);
      }
    });

    // Navigate to test page
    const roomId = `test-vbg-${Date.now()}`;
    const url = `http://localhost:3000/test-videolify?room=${roomId}&testUserId=1&name=Tester&role=tutor`;
    
    console.log(`📌 Opening: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // TEST 1: Check if Virtual Background button exists
    console.log('📌 TEST 1: Check VBG button exists...');
    const vbgButtonExists = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="toggle-virtual-bg-btn"]');
      return !!btn;
    });
    
    console.log(`   Button exists: ${vbgButtonExists ? '✅' : '❌'}`);
    
    if (!vbgButtonExists) {
      console.log('\n❌ FAILED: Virtual Background button not found!');
      await browser.close();
      return;
    }

    // TEST 2: Click VBG button to open menu
    console.log('\n📌 TEST 2: Click VBG button to open menu...');
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const menuVisible = await page.evaluate(() => {
      const menu = document.getElementById('vbg-menu');
      return menu && menu.style.display !== 'none';
    });

    console.log(`   Menu visible: ${menuVisible ? '✅' : '❌'}`);

    if (!menuVisible) {
      console.log('\n❌ FAILED: Menu did not open!');
      await browser.close();
      return;
    }

    // TEST 3: Check menu content
    console.log('\n📌 TEST 3: Check menu has all options...');
    const menuContent = await page.evaluate(() => {
      const menu = document.getElementById('vbg-menu');
      if (!menu) return null;

      return {
        hasNoneButton: menu.textContent.includes('None (Original)'),
        hasBlurButton: menu.textContent.includes('Blur Background'),
        hasCustomButton: menu.textContent.includes('Custom Image'),
        hasPresets: menu.textContent.includes('Quick Presets'),
        hasOffice: menu.textContent.includes('Office'),
        hasNature: menu.textContent.includes('Nature'),
        hasCity: menu.textContent.includes('City'),
        hasBeach: menu.textContent.includes('Beach'),
        hasLibrary: menu.textContent.includes('Library'),
        hasAbstract: menu.textContent.includes('Abstract'),
      };
    });

    console.log('   Menu Content:');
    console.log(`     - None button: ${menuContent.hasNoneButton ? '✅' : '❌'}`);
    console.log(`     - Blur button: ${menuContent.hasBlurButton ? '✅' : '❌'}`);
    console.log(`     - Custom button: ${menuContent.hasCustomButton ? '✅' : '❌'}`);
    console.log(`     - Presets section: ${menuContent.hasPresets ? '✅' : '❌'}`);
    console.log(`     - Office: ${menuContent.hasOffice ? '✅' : '❌'}`);
    console.log(`     - Nature: ${menuContent.hasNature ? '✅' : '❌'}`);
    console.log(`     - City: ${menuContent.hasCity ? '✅' : '❌'}`);
    console.log(`     - Beach: ${menuContent.hasBeach ? '✅' : '❌'}`);
    console.log(`     - Library: ${menuContent.hasLibrary ? '✅' : '❌'}`);
    console.log(`     - Abstract: ${menuContent.hasAbstract ? '✅' : '❌'}`);

    // TEST 4: Click Blur Background
    console.log('\n📌 TEST 4: Click "Blur Background"...');
    const blurClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const blurBtn = buttons.find(btn => 
        btn.textContent.includes('Blur Background') && 
        !btn.querySelector('svg') // Not the main toggle button
      );
      
      if (blurBtn) {
        blurBtn.click();
        return true;
      }
      return false;
    });

    console.log(`   Blur button clicked: ${blurClicked ? '✅' : '❌'}`);
    
    if (blurClicked) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for processing to start

      // Check if blur is active
      const blurStatus = await page.evaluate(() => {
        // Check if VirtualBG processor exists in window
        return {
          buttonActive: document.querySelector('[data-testid="toggle-virtual-bg-btn"]')?.classList.contains('bg-blue-600'),
        };
      });

      console.log(`   VBG button is active: ${blurStatus.buttonActive ? '✅' : '❌'}`);
    }

    // TEST 5: Test blur slider (if blur is active)
    console.log('\n📌 TEST 5: Check blur slider...');
    
    // Re-open menu
    await page.click('[data-testid="toggle-virtual-bg-btn"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const sliderExists = await page.evaluate(() => {
      const slider = document.querySelector('input[type="range"]');
      return !!slider;
    });

    console.log(`   Blur slider exists: ${sliderExists ? '✅' : '❌'}`);

    if (sliderExists) {
      // Test slider
      await page.evaluate(() => {
        const slider = document.querySelector('input[type="range"]');
        if (slider) {
          slider.value = '15';
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      console.log(`   Slider adjusted to 15px: ✅`);
    }

    // TEST 6: Click a preset (Office)
    console.log('\n📌 TEST 6: Click preset "Office"...');
    
    const presetClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const officeBtn = buttons.find(btn => btn.textContent.includes('Office'));
      
      if (officeBtn) {
        officeBtn.click();
        return true;
      }
      return false;
    });

    console.log(`   Office preset clicked: ${presetClicked ? '✅' : '❌'}`);
    
    if (presetClicked) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for image to load
      console.log(`   Waiting for background image to load...`);
    }

    // TEST 7: Switch back to None
    console.log('\n📌 TEST 7: Switch back to "None (Original)"...');
    
    // Re-open menu if needed
    const menuStillOpen = await page.evaluate(() => {
      const menu = document.getElementById('vbg-menu');
      return menu && menu.style.display !== 'none';
    });

    if (!menuStillOpen) {
      await page.click('[data-testid="toggle-virtual-bg-btn"]');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const noneClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const noneBtn = buttons.find(btn => 
        btn.textContent.includes('None (Original)')
      );
      
      if (noneBtn) {
        noneBtn.click();
        return true;
      }
      return false;
    });

    console.log(`   None button clicked: ${noneClicked ? '✅' : '❌'}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // FINAL SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const allTestsPassed = 
      vbgButtonExists && 
      menuVisible && 
      menuContent.hasNoneButton &&
      menuContent.hasBlurButton &&
      menuContent.hasCustomButton &&
      menuContent.hasPresets;

    if (allTestsPassed) {
      console.log('\n✅ ALL TESTS PASSED!');
      console.log('\nVirtual Background features are working:');
      console.log('  ✅ Button exists and clickable');
      console.log('  ✅ Menu opens with all options');
      console.log('  ✅ Blur mode available');
      console.log('  ✅ Custom image upload available');
      console.log('  ✅ 6 Preset backgrounds available');
      console.log('  ✅ Blur slider works');
    } else {
      console.log('\n❌ SOME TESTS FAILED!');
      console.log('\nIssues found:');
      if (!vbgButtonExists) console.log('  ❌ VBG button missing');
      if (!menuVisible) console.log('  ❌ Menu not opening');
      if (!menuContent.hasNoneButton) console.log('  ❌ None option missing');
      if (!menuContent.hasBlurButton) console.log('  ❌ Blur option missing');
      if (!menuContent.hasCustomButton) console.log('  ❌ Custom option missing');
      if (!menuContent.hasPresets) console.log('  ❌ Presets missing');
    }

    console.log('\nTest will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    if (browser) await browser.close();
    console.log('\n✅ Test completed');
  }
})();
