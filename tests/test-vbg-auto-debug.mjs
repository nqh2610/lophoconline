// Auto-test and debug Virtual Background feature
import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function autoTestVBG() {
  console.log('🚀 Starting Virtual Background Auto-Test & Debug...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    const page = await browser.newPage();
    
    // Listen to console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('[VBG]') || text.includes('❌') || text.includes('✅')) {
        console.log('📝', text);
      }
    });
    
    // Listen to errors
    page.on('pageerror', error => {
      console.error('❌ PAGE ERROR:', error.message);
    });
    
    console.log('📍 Step 1: Navigate to localhost...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📍 Step 2: Check if app loaded...');
    const appLoaded = await page.evaluate(() => {
      return document.querySelector('body') !== null;
    });
    console.log(appLoaded ? '✅ App loaded' : '❌ App failed to load');
    
    console.log('📍 Step 3: Wait for media permissions...');
    await sleep(3000);
    
    console.log('📍 Step 4: Check localStorage...');
    const localStorageData = await page.evaluate(() => {
      return {
        'vbg-last-background': localStorage.getItem('vbg-last-background'),
        'vbg-last-mode': localStorage.getItem('vbg-last-mode'),
        'vbg-enabled': localStorage.getItem('vbg-enabled')
      };
    });
    console.log('📦 localStorage:', localStorageData);
    
    console.log('📍 Step 5: Look for VBG button...');
    await sleep(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-vbg-initial.png', fullPage: true });
    console.log('📸 Screenshot saved: test-vbg-initial.png');
    
    console.log('📍 Step 6: Try to find and click VBG button...');
    const vbgButtonFound = await page.evaluate(() => {
      // Try to find button by various selectors
      const buttons = Array.from(document.querySelectorAll('button'));
      const vbgButton = buttons.find(b => 
        b.textContent?.includes('Hiệu ứng') || 
        b.getAttribute('title')?.includes('nền ảo') ||
        b.querySelector('svg') // May have an icon
      );
      
      if (vbgButton) {
        console.log('✅ Found VBG button:', vbgButton.outerHTML.substring(0, 100));
        vbgButton.click();
        return true;
      }
      return false;
    });
    
    if (!vbgButtonFound) {
      console.log('❌ VBG button not found. Checking what buttons exist...');
      const buttonTexts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent?.substring(0, 50),
          title: b.getAttribute('title')
        }));
      });
      console.log('Available buttons:', buttonTexts);
    } else {
      console.log('✅ Clicked VBG button');
      await sleep(1000);
      
      // Screenshot after opening
      await page.screenshot({ path: 'test-vbg-opened.png', fullPage: true });
      console.log('📸 Screenshot saved: test-vbg-opened.png');
      
      console.log('📍 Step 7: Check for background thumbnails...');
      const thumbnailCount = await page.evaluate(() => {
        const thumbnails = document.querySelectorAll('img[alt*="Office"], img[alt*="Beach"], img[alt*="Nature"]');
        return thumbnails.length;
      });
      console.log(`📊 Found ${thumbnailCount} background thumbnails`);
      
      if (thumbnailCount > 0) {
        console.log('📍 Step 8: Click first background...');
        await page.evaluate(() => {
          const thumbnails = document.querySelectorAll('img[alt*="Office"], img[alt*="Beach"], img[alt*="Nature"]');
          if (thumbnails[0]) {
            thumbnails[0].closest('button')?.click();
          }
        });
        
        console.log('⏳ Waiting for background to apply (5 seconds)...');
        await sleep(5000);
        
        // Screenshot after applying background
        await page.screenshot({ path: 'test-vbg-applied.png', fullPage: true });
        console.log('📸 Screenshot saved: test-vbg-applied.png');
        
        console.log('📍 Step 9: Check if video is black...');
        const videoAnalysis = await page.evaluate(() => {
          const videos = document.querySelectorAll('video');
          const results = [];
          
          videos.forEach((video, idx) => {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            
            try {
              ctx.drawImage(video, 0, 0, 100, 100);
              const imageData = ctx.getImageData(0, 0, 100, 100);
              const data = imageData.data;
              
              let totalBrightness = 0;
              for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                totalBrightness += avg;
              }
              const avgBrightness = totalBrightness / (data.length / 4);
              
              results.push({
                index: idx,
                width: video.videoWidth,
                height: video.videoHeight,
                avgBrightness: avgBrightness.toFixed(2),
                isBlack: avgBrightness < 10,
                readyState: video.readyState
              });
            } catch (err) {
              results.push({
                index: idx,
                error: err.message
              });
            }
          });
          
          return results;
        });
        
        console.log('🎥 Video analysis:', JSON.stringify(videoAnalysis, null, 2));
        
        // Check for black screen
        const hasBlackVideo = videoAnalysis.some(v => v.isBlack);
        if (hasBlackVideo) {
          console.log('❌ DETECTED BLACK SCREEN! Checking console logs for errors...');
        } else {
          console.log('✅ Video appears to be working (not black)');
        }
        
        console.log('📍 Step 10: Test F5 localStorage persistence...');
        console.log('🔄 Refreshing page...');
        await page.reload({ waitUntil: 'networkidle2' });
        await sleep(5000);
        
        // Screenshot after reload
        await page.screenshot({ path: 'test-vbg-after-f5.png', fullPage: true });
        console.log('📸 Screenshot saved: test-vbg-after-f5.png');
        
        const localStorageAfterReload = await page.evaluate(() => {
          return {
            'vbg-last-background': localStorage.getItem('vbg-last-background'),
            'vbg-last-mode': localStorage.getItem('vbg-last-mode'),
            'vbg-enabled': localStorage.getItem('vbg-enabled')
          };
        });
        console.log('📦 localStorage after F5:', localStorageAfterReload);
        
        if (localStorageAfterReload['vbg-last-background']) {
          console.log('✅ localStorage persisted after F5');
        } else {
          console.log('❌ localStorage NOT persisted after F5');
        }
      }
    }
    
    console.log('\n📋 SUMMARY OF LOGS:');
    console.log('='.repeat(60));
    
    const vbgLogs = logs.filter(l => l.includes('[VBG]'));
    const errorLogs = logs.filter(l => l.includes('❌'));
    
    console.log(`\n🔍 VBG Logs (${vbgLogs.length}):`);
    vbgLogs.forEach(log => console.log('  ', log));
    
    console.log(`\n❌ Error Logs (${errorLogs.length}):`);
    errorLogs.forEach(log => console.log('  ', log));
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed. Check screenshots for visual verification.');
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
    await sleep(30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

autoTestVBG().catch(console.error);
