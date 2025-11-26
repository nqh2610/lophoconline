#!/usr/bin/env node
/**
 * TEST PERMISSION DENIAL DETECTION
 * Verify that app correctly detects dummy tracks and requests real camera/mic
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify';

async function testPermissionDenialFlow() {
  console.log('\n🔬 TESTING PERMISSION DENIAL DETECTION');
  console.log('='.repeat(70));
  
  const ROOM = `deny-test-${Date.now()}`;
  
  let browser;
  
  try {
    // Launch Chrome WITHOUT granting permissions initially
    browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });
    
    // Context WITHOUT camera/mic permissions
    const context = await browser.newContext({
      permissions: [] // No permissions granted
    });
    
    const page = await context.newPage();
    
    // Track console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('dummy') || text.includes('Dummy')) {
        console.log(`   📝 ${text}`);
      }
    });
    
    // Navigate to room
    const url = `${BASE_URL}?room=${ROOM}&testUserId=1&name=TestUser&role=student`;
    console.log('\n1️⃣ Joining room WITHOUT camera/mic permissions...');
    await page.goto(url);
    
    // Wait for initial setup
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if dummy tracks were created
    const initialState = await page.evaluate(() => {
      const localVideo = document.querySelector('video[muted]');
      const stream = localVideo?.srcObject;
      const videoTrack = stream?.getVideoTracks()[0];
      const audioTrack = stream?.getAudioTracks()[0];
      
      return {
        hasStream: !!stream,
        videoTrackLabel: videoTrack?.label || 'none',
        audioTrackLabel: audioTrack?.label || 'none',
        videoTrackEnabled: videoTrack?.enabled,
        audioTrackEnabled: audioTrack?.enabled,
      };
    });
    
    console.log('\n   Initial state (permissions DENIED):');
    console.log(`   Video track: ${initialState.videoTrackLabel} (enabled: ${initialState.videoTrackEnabled})`);
    console.log(`   Audio track: ${initialState.audioTrackLabel} (enabled: ${initialState.audioTrackEnabled})`);
    
    // Verify dummy tracks created
    const isDummyVideo = initialState.videoTrackLabel.includes('canvas');
    const isDummyAudio = initialState.audioTrackLabel === 'none' || initialState.audioTrackLabel === '';
    
    if (isDummyVideo && isDummyAudio) {
      console.log('   ✅ Dummy tracks created correctly (permissions denied)');
    } else {
      console.log('   ⚠️  Expected dummy tracks, got real tracks?');
    }
    
    // Now grant permissions and try to toggle camera
    console.log('\n2️⃣ Granting permissions...');
    await context.grantPermissions(['camera', 'microphone']);
    
    // Try clicking video toggle button
    console.log('\n3️⃣ Clicking camera toggle button...');
    
    // Find camera button (first button in controls)
    const buttons = await page.locator('button').all();
    if (buttons.length > 0) {
      await buttons[0].click();
      console.log('   📸 Camera button clicked');
      
      // Wait for getUserMedia request
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if real camera was requested
      const afterToggle = await page.evaluate(() => {
        const localVideo = document.querySelector('video[muted]');
        const stream = localVideo?.srcObject;
        const videoTrack = stream?.getVideoTracks()[0];
        
        return {
          videoTrackLabel: videoTrack?.label || 'none',
          videoTrackEnabled: videoTrack?.enabled,
        };
      });
      
      console.log('\n   After toggle:');
      console.log(`   Video track: ${afterToggle.videoTrackLabel} (enabled: ${afterToggle.videoTrackEnabled})`);
      
      // Check if still dummy or now real camera
      const isStillDummy = afterToggle.videoTrackLabel.includes('canvas');
      const isRealCamera = !isStillDummy && afterToggle.videoTrackLabel !== 'none';
      
      if (isRealCamera) {
        console.log('   ✅ SUCCESS: Real camera track obtained!');
        console.log('   ✅ Fix working: App detected dummy track and requested real camera');
      } else if (isStillDummy) {
        console.log('   ❌ FAIL: Still using dummy track');
        console.log('   ❌ Fix NOT working: App should request real camera');
      } else {
        console.log('   ⚠️  UNEXPECTED: No track found');
      }
      
      // Check console logs for getUserMedia request
      const hasGetUserMediaLog = logs.some(log => 
        log.includes('requesting camera access') || 
        log.includes('Requesting media access')
      );
      
      if (hasGetUserMediaLog) {
        console.log('   ✅ getUserMedia was called (detected in console logs)');
      } else {
        console.log('   ⚠️  getUserMedia may not have been called');
      }
    } else {
      console.log('   ⚠️  Could not find camera button');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 TEST COMPLETE');
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testPermissionDenialFlow().catch(console.error);
