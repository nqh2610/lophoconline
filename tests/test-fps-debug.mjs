import { chromium } from 'playwright';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testFPS() {
  console.log('🚀 Testing VBG FPS Performance...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  try {
    const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const page = await context.newPage();
    
    // Collect performance logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[VBG]') || text.includes('FPS') || text.includes('Performance')) {
        console.log('📊', text);
      }
    });
    
    console.log('📍 Step 1: Navigate to app...');
    await page.goto('http://localhost:3000/test-videolify?room=fps-test&testUserId=1&name=Test&role=tutor', {
      waitUntil: 'domcontentloaded'
    });
    await sleep(5000);
    
    console.log('📍 Step 2: Enable blur background...');
    const vbgButton = await page.locator('button[title*="background"], button[title*="Virtual"]').first();
    if (await vbgButton.count() > 0) {
      await vbgButton.click();
      await sleep(1000);
      
      const blurButton = await page.locator('button[data-testid="vbg-mode-blur"]');
      if (await blurButton.count() > 0) {
        await blurButton.click();
        await sleep(2000);
        console.log('✅ Blur enabled, monitoring FPS for 30 seconds...');
      }
    }
    
    // Monitor FPS for 30 seconds
    await sleep(30000);
    
    console.log('📍 Step 3: Switch to image background...');
    const firstBg = await page.locator('.grid img').first();
    if (await firstBg.count() > 0) {
      await firstBg.click();
      await sleep(2000);
      console.log('✅ Image background enabled, monitoring for 30 seconds...');
      await sleep(30000);
    }
    
    console.log('\n✅ Test completed. Check FPS logs above.');
    console.log('Expected: ~30 FPS for smooth video');
    console.log('If FPS < 15: Video will freeze/lag for peer');
    
    await sleep(10000);
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await browser.close();
  }
}

testFPS();
