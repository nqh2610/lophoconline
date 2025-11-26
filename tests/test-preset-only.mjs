/**
 * SIMPLE TEST: Preset background only
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const TEST_ROOM = 'preset-test-' + Date.now();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log('🧪 TESTING PRESET BACKGROUND SYNC\n');

  const browser1 = await puppeteer.launch({ 
    headless: false, 
    args: [
      '--use-fake-ui-for-media-stream', 
      '--use-fake-device-for-media-stream',
      '--window-size=900,700'
    ] 
  });
  
  const browser2 = await puppeteer.launch({ 
    headless: false, 
    args: [
      '--use-fake-ui-for-media-stream', 
      '--use-fake-device-for-media-stream',
      '--window-size=900,700',
      '--window-position=920,0'
    ] 
  });

  try {
    const local = await browser1.newPage();
    const peer = await browser2.newPage();

    local.on('console', msg => {
      const text = msg.text();
      if (text.includes('VBG') || text.includes('TEST')) {
        console.log(`[LOCAL] ${text}`);
      }
    });
    
    peer.on('console', msg => {
      const text = msg.text();
      if (text.includes('VBG')) {
        console.log(`[PEER] ${text}`);
      }
    });

    console.log('Step 1: Open both browsers');
    await local.goto(`${BASE_URL}/test-videolify?room=${TEST_ROOM}&testUserId=1&name=Local&role=tutor`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await peer.goto(`${BASE_URL}/test-videolify?room=${TEST_ROOM}&testUserId=2&name=Peer&role=student`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log('Waiting for initialization (10s)...');
    await sleep(10000);
    
    // Wait for connection
    console.log('\nStep 2: Wait for WebRTC connection');
    for (let i = 0; i < 20; i++) {
      const [localHasRemote, peerHasRemote] = await Promise.all([
        local.evaluate(() => {
          const v = document.querySelector('video:not([muted])');
          return v?.srcObject?.getVideoTracks().length > 0;
        }),
        peer.evaluate(() => {
          const v = document.querySelector('video:not([muted])');
          return v?.srcObject?.getVideoTracks().length > 0;
        })
      ]);
      
      if (localHasRemote && peerHasRemote) {
        console.log(`✅ Connected after ${i + 1}s`);
        break;
      }
      await sleep(1000);
    }
    
    await sleep(2000);

    console.log('\nStep 3: Local clicks VBG menu');
    await local.click('[data-testid="toggle-virtual-bg-btn"]');
    await sleep(1000);

    console.log('\nStep 4: Check how many preset buttons exist');
    const presetInfo = await local.evaluate(() => {
      const presets = document.querySelectorAll('[data-testid^="vbg-preset-"]');
      return {
        count: presets.length,
        testIds: Array.from(presets).map(p => p.getAttribute('data-testid'))
      };
    });
    
    console.log('Preset buttons found:', presetInfo);

    if (presetInfo.count === 0) {
      console.log('\n❌ NO PRESET BUTTONS FOUND!');
      console.log('Checking if category filter is hiding them...');
      
      // Try clicking "All" category
      const allClicked = await local.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const allBtn = btns.find(b => b.textContent?.includes('Tất cả') || b.textContent?.includes('All'));
        if (allBtn) {
          allBtn.click();
          return true;
        }
        return false;
      });
      
      console.log('All category clicked:', allClicked);
      await sleep(500);
      
      const presetInfo2 = await local.evaluate(() => {
        const presets = document.querySelectorAll('[data-testid^="vbg-preset-"]');
        return {
          count: presets.length,
          testIds: Array.from(presets).map(p => p.getAttribute('data-testid'))
        };
      });
      
      console.log('After clicking All:', presetInfo2);
    }

    if (presetInfo.count > 0 || (await local.evaluate(() => document.querySelectorAll('[data-testid^="vbg-preset-"]').length)) > 0) {
      console.log('\nStep 5: Click first preset');
      const clicked = await local.evaluate(() => {
        const preset = document.querySelector('[data-testid="vbg-preset-0"]');
        if (preset) {
          preset.click();
          console.log('✅ [TEST] Preset 0 clicked via evaluate');
          return true;
        }
        return false;
      });
      
      if (!clicked) {
        console.log('❌ Could not click preset!');
        return;
      }
      
      console.log('Waiting for preset to load and broadcast (12s)...');
      await sleep(12000);

      const peerBG = await peer.evaluate(() => {
        const allKeys = Object.keys(localStorage);
        const peerBgKeys = allKeys.filter(k => k.includes('peer') && k.includes('background'));
        const result = {};
        peerBgKeys.forEach(k => result[k] = localStorage.getItem(k));
        return result;
      });

      console.log('\n═══════════════════════════════════');
      console.log('RESULT');
      console.log('═══════════════════════════════════');
      console.log('Peer background storage:', JSON.stringify(peerBG, null, 2));

      if (Object.keys(peerBG).length > 0) {
        console.log('\n🎉 🎉 🎉 SUCCESS! Peer received preset background image!');
      } else {
        console.log('\n❌ FAILED: Peer did NOT receive background image');
      }
    } else {
      console.log('\n❌ CANNOT TEST: No preset buttons found');
    }

    await sleep(5000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser1.close();
    await browser2.close();
    console.log('\n✅ Done');
  }
}

test().catch(console.error);
