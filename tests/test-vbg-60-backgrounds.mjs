import puppeteer from 'puppeteer';

/**
 * AUTO TEST: VIRTUAL BACKGROUND - 60 backgrounds + localStorage
 */

async function testVirtualBackground() {
  console.log('🚀 Starting Virtual Background Test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox'
    ]
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[VBG]') || text.includes('background') || text.includes('localStorage')) {
      console.log('   📝', text);
    }
  });
  
  try {
    console.log('1️⃣ Loading app...');
    await page.goto('http://localhost:3000/videolify/test-room-123', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n2️⃣ Checking if Virtual Background menu exists...');
    const vbgButton = await page.$('[aria-label*="Background"], button:has-text("Background"), button:has-text("Blur")');
    
    if (!vbgButton) {
      console.log('❌ Virtual Background button not found!');
      console.log('   Trying to find by selector...');
      
      // Check all buttons
      const buttons = await page.$$('button');
      console.log(`   Found ${buttons.length} buttons`);
      
      for (let i = 0; i < buttons.length; i++) {
        const text = await page.evaluate(el => el.textContent, buttons[i]);
        if (text.toLowerCase().includes('background') || text.toLowerCase().includes('blur')) {
          console.log(`   ✅ Found button: "${text}"`);
        }
      }
      
      await browser.close();
      return;
    }
    
    console.log('✅ Virtual Background button found!');
    
    console.log('\n3️⃣ Opening Virtual Background menu...');
    await vbgButton.click();
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n4️⃣ Checking PRESET_BACKGROUNDS count...');
    const bgCount = await page.evaluate(() => {
      const backgrounds = document.querySelectorAll('[data-background-name], .background-preset, img[alt*="background"]');
      return backgrounds.length;
    });
    
    console.log(`   Found ${bgCount} background thumbnails`);
    
    if (bgCount < 60) {
      console.log(`   ⚠️  Expected 60 backgrounds, found ${bgCount}`);
    } else if (bgCount === 60) {
      console.log('   ✅ Correct! 60 backgrounds displayed');
    } else {
      console.log(`   ✅ ${bgCount} backgrounds (more than 60, OK)`);
    }
    
    console.log('\n5️⃣ Testing background selection...');
    const firstBg = await page.$('img[src*="unsplash"]');
    if (firstBg) {
      console.log('   Clicking first background...');
      await firstBg.click();
      await new Promise(r => setTimeout(r, 3000)); // Wait for processing
      
      console.log('\n6️⃣ Checking localStorage...');
      const savedBg = await page.evaluate(() => localStorage.getItem('vbg-last-background'));
      const savedMode = await page.evaluate(() => localStorage.getItem('vbg-last-mode'));
      const vbgEnabled = await page.evaluate(() => localStorage.getItem('vbg-enabled'));
      
      console.log(`   vbg-last-background: ${savedBg}`);
      console.log(`   vbg-last-mode: ${savedMode}`);
      console.log(`   vbg-enabled: ${vbgEnabled}`);
      
      if (savedBg && savedMode === 'image' && vbgEnabled === 'true') {
        console.log('   ✅ localStorage working correctly!');
      } else {
        console.log('   ❌ localStorage not saved properly!');
      }
      
      console.log('\n7️⃣ Testing F5 restore...');
      console.log('   Refreshing page...');
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000));
      
      const restoredBg = await page.evaluate(() => localStorage.getItem('vbg-last-background'));
      console.log(`   After F5, vbg-last-background: ${restoredBg}`);
      
      if (restoredBg === savedBg) {
        console.log('   ✅ Background persisted after refresh!');
      } else {
        console.log('   ❌ Background not restored!');
      }
    } else {
      console.log('   ❌ No background thumbnails found!');
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
}

testVirtualBackground().catch(console.error);
