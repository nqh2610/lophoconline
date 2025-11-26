/**
 * Test various prejoin settings combinations
 */

import { chromium } from 'playwright';

const PREJOIN_URL = 'http://localhost:3000/prejoin-videolify-v2?accessToken=6a153ff371da509cabc2109e759a2afcd1bbe56f3ced55aaf77ef0cb88f1f5ae';

async function testPrejoinVariations() {
  console.log('\n🧪 Testing Multiple Prejoin Settings Variations\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });

  const testCases = [
    {
      name: 'Camera ON, Mic OFF, No VBG',
      settings: {
        isCameraEnabled: true,
        isMicEnabled: false,
        vbgEnabled: false,
        vbgMode: 'none',
        vbgBlurAmount: 0,
        vbgActivePreset: null,
        vbgBackgroundImage: null,
      },
      expected: {
        camera: true,
        mic: false,
        vbg: false,
      },
    },
    {
      name: 'Camera OFF, Mic OFF, Blur VBG',
      settings: {
        isCameraEnabled: false,
        isMicEnabled: false,
        vbgEnabled: true,
        vbgMode: 'blur',
        vbgBlurAmount: 20,
        vbgActivePreset: null,
        vbgBackgroundImage: null,
      },
      expected: {
        camera: false,
        mic: false,
        vbg: true,
      },
    },
    {
      name: 'Camera ON, Mic ON, No VBG',
      settings: {
        isCameraEnabled: true,
        isMicEnabled: true,
        vbgEnabled: false,
        vbgMode: 'none',
        vbgBlurAmount: 0,
        vbgActivePreset: null,
        vbgBackgroundImage: null,
      },
      expected: {
        camera: true,
        mic: true,
        vbg: false,
      },
    },
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Test Case: ${testCase.name}`);
    console.log(`${'='.repeat(60)}\n`);

    const page = await context.newPage();

    // Collect logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[VideolifyFull_v2]') || text.includes('[Prejoin]')) {
        console.log('   📝', text.substring(0, 100));
      }
    });

    // Set localStorage
    await page.goto(PREJOIN_URL);
    await page.evaluate((settings) => {
      localStorage.setItem('videolify_prejoin_settings', JSON.stringify({
        ...settings,
        lastUpdated: Date.now(),
      }));
    }, testCase.settings);

    await page.reload();
    console.log('⏳ Waiting for prejoin page...');
    await page.waitForTimeout(2000);

    // Click join button
    console.log('\n🖱️  Clicking "Tham gia ngay" button...\n');
    try {
      await page.click('button:has-text("Tham gia ngay")');
    } catch {
      console.log('❌ Could not find join button');
      await page.close();
      failedCount++;
      continue;
    }

    console.log('⏳ Waiting for video call...');
    await page.waitForURL(/\/video-call-v2/, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(7000); // Wait longer for VBG to apply

    // Check results
    const results = await page.evaluate(() => {
      const video = document.querySelector('video');
      const stream = video?.srcObject;
      
      if (!stream || !(stream instanceof MediaStream)) {
        return { error: 'No stream' };
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      // Check VBG
      const vbgLoading = !!document.querySelector('[data-vbg-loading="true"]');
      const vbgApplied = !!window.__vbgEnabled || 
        document.documentElement.getAttribute('data-vbg-active') === 'true';
      
      return {
        hasVideo: !!video?.srcObject,
        cameraEnabled: videoTrack?.enabled ?? null,
        micEnabled: audioTrack?.enabled ?? null,
        vbgApplied,
        vbgLoading,
      };
    });

    console.log('\n📊 Results:');
    console.log(`   Camera: ${results.cameraEnabled === testCase.expected.camera ? '✅' : '❌'} ${results.cameraEnabled ? 'ON' : 'OFF'} (expected: ${testCase.expected.camera ? 'ON' : 'OFF'})`);
    console.log(`   Mic: ${results.micEnabled === testCase.expected.mic ? '✅' : '❌'} ${results.micEnabled ? 'ON' : 'OFF'} (expected: ${testCase.expected.mic ? 'ON' : 'OFF'})`);
    
    if (testCase.expected.vbg) {
      console.log(`   VBG: ${results.vbgApplied || results.vbgLoading ? '✅' : '❌'} ${results.vbgApplied ? 'Applied' : 'Not Applied'}`);
    } else {
      console.log(`   VBG: ${!results.vbgApplied ? '✅' : '❌'} Disabled (as expected)`);
    }

    const passed = 
      results.cameraEnabled === testCase.expected.camera &&
      results.micEnabled === testCase.expected.mic;

    if (passed) {
      console.log('\n✅ TEST PASSED');
      passedCount++;
    } else {
      console.log('\n❌ TEST FAILED');
      failedCount++;
    }

    await page.waitForTimeout(2000);
    await page.close();
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 FINAL SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`   Passed: ${passedCount}/${testCases.length}`);
  console.log(`   Failed: ${failedCount}/${testCases.length}`);
  console.log(`${'='.repeat(60)}\n`);

  await browser.close();

  if (failedCount > 0) {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

testPrejoinVariations().catch(console.error);
