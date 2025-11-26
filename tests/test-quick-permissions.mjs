#!/usr/bin/env node
/**
 * QUICK PERMISSION TEST
 * Case 1: Deny permissions initially (no camera/mic)
 * Case 2: Grant permissions initially (with camera/mic)
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000/test-videolify';

async function testPermissionScenario(grantPermissions, attemptNum) {
  const ROOM = `perm-test-${Date.now()}`;
  const scenarioName = grantPermissions ? 'WITH Camera/Mic' : 'WITHOUT Camera/Mic (denied)';
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 ATTEMPT ${attemptNum} - ${scenarioName}`);
  console.log('='.repeat(70));

  let chromeBrowser, edgeBrowser;

  try {
    // Launch browsers
    chromeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'chrome',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });

    edgeBrowser = await chromium.launch({ 
      headless: false,
      channel: 'msedge',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });

    // Set permissions based on scenario
    const permissions = grantPermissions ? ['camera', 'microphone'] : [];
    
    const chromeContext = await chromeBrowser.newContext({ permissions });
    const edgeContext = await edgeBrowser.newContext({ permissions });

    const chromePage = await chromeContext.newPage();
    const edgePage = await edgeContext.newPage();

    // Navigate
    const chromeUrl = `${BASE_URL}?room=${ROOM}&testUserId=1&name=Chrome&role=student`;
    const edgeUrl = `${BASE_URL}?room=${ROOM}&testUserId=2&name=Edge&role=tutor`;

    console.log(`   Permissions: ${grantPermissions ? 'GRANTED' : 'DENIED'}`);
    
    await Promise.all([
      chromePage.goto(chromeUrl),
      edgePage.goto(edgeUrl),
    ]);

    // Wait for connection
    console.log(`   Waiting 15s for connection...`);
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Check connection
    const chromeState = await chromePage.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      const localVideo = document.querySelector('video[muted]');
      const remoteVideo = Array.from(document.querySelectorAll('video')).find(v => !v.muted);
      
      return {
        connectionState: pc?.connectionState,
        iceState: pc?.iceConnectionState,
        hasLocalVideo: !!(localVideo?.srcObject),
        hasRemoteVideo: !!(remoteVideo?.srcObject),
        localTracks: localVideo?.srcObject?.getTracks().length || 0,
        remoteTracks: remoteVideo?.srcObject?.getTracks().length || 0,
      };
    });

    const edgeState = await edgePage.evaluate(() => {
      const pc = window.__VIDEOLIFY_DEBUG__?.peerConnection;
      const localVideo = document.querySelector('video[muted]');
      const remoteVideo = Array.from(document.querySelectorAll('video')).find(v => !v.muted);
      
      return {
        connectionState: pc?.connectionState,
        iceState: pc?.iceConnectionState,
        hasLocalVideo: !!(localVideo?.srcObject),
        hasRemoteVideo: !!(remoteVideo?.srcObject),
        localTracks: localVideo?.srcObject?.getTracks().length || 0,
        remoteTracks: remoteVideo?.srcObject?.getTracks().length || 0,
      };
    });

    console.log(`\n   🟦 Chrome:`);
    console.log(`      Connection: ${chromeState.connectionState} (ICE: ${chromeState.iceState})`);
    console.log(`      Local video: ${chromeState.hasLocalVideo} (${chromeState.localTracks} tracks)`);
    console.log(`      Remote video: ${chromeState.hasRemoteVideo} (${chromeState.remoteTracks} tracks)`);

    console.log(`\n   🟩 Edge:`);
    console.log(`      Connection: ${edgeState.connectionState} (ICE: ${edgeState.iceState})`);
    console.log(`      Local video: ${edgeState.hasLocalVideo} (${edgeState.localTracks} tracks)`);
    console.log(`      Remote video: ${edgeState.hasRemoteVideo} (${edgeState.remoteTracks} tracks)`);

    const chromeOK = chromeState.connectionState === 'connected';
    const edgeOK = edgeState.connectionState === 'connected';
    const success = chromeOK && edgeOK;

    if (success) {
      console.log(`\n✅ PASS - Connection successful`);
      
      // Additional checks for granted permissions
      if (grantPermissions) {
        if (chromeState.hasLocalVideo && edgeState.hasRemoteVideo) {
          console.log(`   ✅ Video transmission: Chrome → Edge working`);
        } else {
          console.log(`   ⚠️  Video transmission: Chrome → Edge NOT working`);
        }
        
        if (edgeState.hasLocalVideo && chromeState.hasRemoteVideo) {
          console.log(`   ✅ Video transmission: Edge → Chrome working`);
        } else {
          console.log(`   ⚠️  Video transmission: Edge → Chrome NOT working`);
        }
      }
    } else {
      console.log(`\n❌ FAIL - Connection failed`);
    }

    return { success };

  } catch (err) {
    console.log(`\n❌ CRASH - ${err.message}`);
    return { success: false };
  } finally {
    if (chromeBrowser) await chromeBrowser.close();
    if (edgeBrowser) await edgeBrowser.close();
  }
}

async function runTests() {
  console.log('\n🔬 CAMERA/MIC PERMISSION TEST');
  console.log('Testing 2 scenarios: Denied vs Granted permissions\n');

  const results = [];

  // Test 1: WITHOUT permissions (denied)
  console.log('\n' + '█'.repeat(70));
  console.log('📋 SCENARIO 1: Camera/Mic DENIED');
  console.log('█'.repeat(70));
  
  let deniedPassed = 0;
  for (let i = 1; i <= 3; i++) {
    const result = await testPermissionScenario(false, i);
    if (result.success) deniedPassed++;
  }
  
  console.log(`\n📊 Denied permissions: ${deniedPassed}/3 passed (${Math.round(deniedPassed/3*100)}%)`);
  results.push({ name: 'Denied', passed: deniedPassed, total: 3 });

  // Test 2: WITH permissions (granted)
  console.log('\n\n' + '█'.repeat(70));
  console.log('📋 SCENARIO 2: Camera/Mic GRANTED');
  console.log('█'.repeat(70));
  
  let grantedPassed = 0;
  for (let i = 1; i <= 3; i++) {
    const result = await testPermissionScenario(true, i);
    if (result.success) grantedPassed++;
  }
  
  console.log(`\n📊 Granted permissions: ${grantedPassed}/3 passed (${Math.round(grantedPassed/3*100)}%)`);
  results.push({ name: 'Granted', passed: grantedPassed, total: 3 });

  // Final summary
  console.log('\n\n' + '█'.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('█'.repeat(70));
  
  results.forEach(r => {
    const icon = r.passed === r.total ? '✅' : '⚠️';
    console.log(`${icon} ${r.name} permissions: ${r.passed}/${r.total} (${Math.round(r.passed/r.total*100)}%)`);
  });

  const total = results.reduce((sum, r) => sum + r.passed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  console.log(`\n🎯 OVERALL: ${total}/${totalTests} (${Math.round(total/totalTests*100)}%)`);
}

runTests().catch(console.error);
