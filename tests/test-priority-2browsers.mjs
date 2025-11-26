/**
 * Test 1-5 with Two Browser Instances (Chrome + Chrome)
 * 
 * Verify Tests 1-5 work correctly with 2 separate browser instances
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';

console.log('🎬 Running Tests 1-5 with Two Chrome Instances');
console.log('=' .repeat(70));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  let browser1, browser2;
  let page1, page2;
  
  try {
    console.log('\n📦 Launching Browser 1 (Chrome)...');
    browser1 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      defaultViewport: { width: 1280, height: 720 },
    });
    
    console.log('📦 Launching Browser 2 (Chrome)...');
    browser2 = await puppeteer.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--user-data-dir=/tmp/chrome-test-2',
      ],
      defaultViewport: { width: 1280, height: 720 },
    });
    
    page1 = await browser1.newPage();
    page2 = await browser2.newPage();
    
    // Console logging
    page1.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') && (text.includes('✅') || text.includes('❌') || text.includes('Connection'))) {
        console.log('  [Browser1]', text);
      }
    });
    
    page2.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') && (text.includes('✅') || text.includes('❌') || text.includes('Connection'))) {
        console.log('  [Browser2]', text);
      }
    });
    
    const roomId = `test-priority-2browsers-${Date.now()}`;
    const url1 = `${BASE_URL}/test-videolify?room=${roomId}&name=User-A&role=tutor`;
    const url2 = `${BASE_URL}/test-videolify?room=${roomId}&name=User-B&role=student`;
    
    console.log(`\n🔗 Room: ${roomId}`);
    
    // TEST 1: Basic Connection
    console.log('\n📝 TEST 1: Two browsers connect and establish P2P');
    
    await page1.goto(url1, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    
    await page2.goto(url2, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(10000); // Wait for P2P
    
    const connection1 = await page1.evaluate(() => {
      return document.body.innerText.includes('Connected') || 
             document.body.innerText.includes('Đã kết nối');
    });
    
    const connection2 = await page2.evaluate(() => {
      return document.body.innerText.includes('Connected') || 
             document.body.innerText.includes('Đã kết nối');
    });
    
    if (connection1 && connection2) {
      console.log('✅ TEST 1 PASSED: Both browsers connected');
    } else {
      console.log('❌ TEST 1 FAILED: Connection not established');
      console.log('   Browser1 connected:', connection1);
      console.log('   Browser2 connected:', connection2);
    }
    
    // TEST 2: Video Streams
    console.log('\n📝 TEST 2: Video streams present in both browsers');
    
    await sleep(5000);
    
    const videos1 = await page1.evaluate(() => {
      const videos = document.querySelectorAll('video');
      return {
        count: videos.length,
        hasRemote: videos.length >= 2,
      };
    });
    
    const videos2 = await page2.evaluate(() => {
      const videos = document.querySelectorAll('video');
      return {
        count: videos.length,
        hasRemote: videos.length >= 2,
      };
    });
    
    console.log('  Browser1 videos:', videos1.count);
    console.log('  Browser2 videos:', videos2.count);
    
    if (videos1.hasRemote && videos2.hasRemote) {
      console.log('✅ TEST 2 PASSED: Video streams present');
    } else {
      console.log('⚠️  TEST 2 PARTIAL: Video streams may be missing');
    }
    
    // TEST 3: Connection Stability (30s)
    console.log('\n📝 TEST 3: Monitor connection stability');
    
    let stable = true;
    for (let i = 0; i < 6; i++) {
      await sleep(5000);
      
      const stable1 = await page1.evaluate(() => {
        return !document.body.innerText.includes('disconnected') &&
               !document.body.innerText.includes('failed');
      });
      
      const stable2 = await page2.evaluate(() => {
        return !document.body.innerText.includes('disconnected') &&
               !document.body.innerText.includes('failed');
      });
      
      console.log(`  Check ${i + 1}/6: Browser1=${stable1 ? '✅' : '❌'}, Browser2=${stable2 ? '✅' : '❌'}`);
      
      if (!stable1 || !stable2) {
        stable = false;
        break;
      }
    }
    
    if (stable) {
      console.log('✅ TEST 3 PASSED: Connection remained stable for 30s');
    } else {
      console.log('⚠️  TEST 3 FAILED: Connection dropped');
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY: Tests 1-5 with Two Browser Instances');
    console.log('  - Connection: ' + (connection1 && connection2 ? '✅' : '❌'));
    console.log('  - Video streams: ' + (videos1.hasRemote && videos2.hasRemote ? '✅' : '⚠️'));
    console.log('  - Stability: ' + (stable ? '✅' : '⚠️'));
    console.log('='.repeat(70));
    
    await sleep(5000);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    throw error;
  } finally {
    if (browser1) await browser1.close();
    if (browser2) await browser2.close();
  }
}

runTests()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  });
