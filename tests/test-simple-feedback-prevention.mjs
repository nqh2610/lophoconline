/**
 * TEST: Ultra-Simple Feedback Loop Prevention
 * Kiểm tra: ẨN HOÀN TOÀN local video (KHÔNG avatar, KHÔNG thu nhỏ)
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:3000';
const ROOM_ID = `test-feedback-${Date.now()}`;

console.log('🧪 TEST: Ultra-Simple Feedback Prevention');
console.log('==========================================\n');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFeedbackPrevention() {
  console.log('🚀 Khởi tạo browser...');
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--auto-select-desktop-capture-source=Entire screen',
      '--window-size=1280,720'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Videolify]') || text.includes('Prevention')) {
        console.log(`  📋 ${text}`);
      }
    });

    console.log('📱 Truy cập trang...');
    await page.goto(`${TEST_URL}?room=${ROOM_ID}`, { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });

    await delay(2000);

    console.log('\n✅ STEP 1: Bật screen share\n');
    
    // Click screen share button
    await page.evaluate(() => {
      const button = document.querySelector('button[title*="screen" i], button[title*="màn hình" i]');
      if (button) {
        button.click();
        console.log('[Videolify] Screen share button clicked');
      }
    });

    await delay(3000);

    // Check if local video was COMPLETELY HIDDEN (display: none)
    const videoState = await page.evaluate(() => {
      const localVideo = document.querySelector('#localVideo');
      if (!localVideo) return { found: false };
      
      const style = window.getComputedStyle(localVideo);
      const display = style.display;
      const opacity = parseFloat(style.opacity);
      
      console.log(`[Videolify] Video state: display=${display}, opacity=${opacity}`);
      
      return {
        found: true,
        display,
        opacity,
        isCompletelyHidden: display === 'none'
      };
    });

    console.log(`\n📊 Kết quả:`);
    console.log(`   Display: ${videoState.display}`);
    console.log(`   Opacity: ${videoState.opacity}`);
    console.log(`   Hoàn toàn ẩn: ${videoState.isCompletelyHidden ? '✅ CÓ' : '❌ KHÔNG'}\n`);

    // Check NO avatar placeholder
    const hasPlaceholder = await page.evaluate(() => {
      const placeholder = document.querySelector('.local-video-placeholder');
      return placeholder !== null;
    });

    console.log(`📊 Avatar/Gradient placeholder: ${hasPlaceholder ? '❌ CÓ (SAI!)' : '✅ KHÔNG (ĐÚNG!)'}\n`);

    await delay(3000);

    console.log('✅ STEP 2: Tắt screen share\n');
    
    // Stop screen share
    await page.evaluate(() => {
      const button = document.querySelector('button[title*="screen" i], button[title*="màn hình" i]');
      if (button) {
        button.click();
        console.log('[Videolify] Screen share stopped');
      }
    });

    await delay(2000);

    // Check if video restored
    const restoredState = await page.evaluate(() => {
      const localVideo = document.querySelector('#localVideo');
      if (!localVideo) return { found: false };
      
      const style = window.getComputedStyle(localVideo);
      const display = style.display;
      const opacity = parseFloat(style.opacity);
      
      console.log(`[Videolify] Restored state: display=${display}, opacity=${opacity}`);
      
      return {
        found: true,
        display,
        opacity,
        isVisible: display !== 'none' && opacity > 0
      };
    });

    console.log(`\n📊 Kết quả phục hồi:`);
    console.log(`   Display: ${restoredState.display}`);
    console.log(`   Opacity: ${restoredState.opacity}`);
    console.log(`   Hiển thị bình thường: ${restoredState.isVisible ? '✅ CÓ' : '❌ KHÔNG'}\n`);

    console.log('\n===========================================');
    console.log('📋 SUMMARY:');
    console.log('===========================================');
    console.log(`Video ẩn hoàn toàn (display:none):  ${videoState.isCompletelyHidden ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`KHÔNG có placeholder:               ${!hasPlaceholder ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Phục hồi đúng:                      ${restoredState.isVisible ? '✅ PASS' : '❌ FAIL'}`);
    console.log('===========================================');
    console.log('\n💡 UI/UX: Ẩn hoàn toàn để tránh infinite loop');
    console.log('   - KHÔNG hiện avatar gradient (bị loop)');
    console.log('   - KHÔNG thu nhỏ video (bị loop)');
    console.log('   - Chỉ ẨN hoàn toàn với display: none\n');

    await delay(3000);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test hoàn thành');
  }
}

testFeedbackPrevention();
