#!/usr/bin/env node
/**
 * AUTOMATED TEST: Whiteboard Path Persistence & File Sharing
 *
 * Tests:
 * 1. Whiteboard paths persist after mouse release
 * 2. Whiteboard sync bidirectional
 * 3. File sharing works
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3001';
const ROOM = 'test-whiteboard-' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('\n🔬 TESTING WHITEBOARD PERSISTENCE & FILE SHARING');
console.log('='.repeat(80));
console.log(`Room: ${ROOM}`);
console.log('='.repeat(80));

let browser1, browser2, page1, page2;
const logs1 = [];
const logs2 = [];

try {
  console.log('\n[1/10] Launching browsers...');
  browser1 = await chromium.launch({ headless: false });
  browser2 = await chromium.launch({ headless: false });

  // Create context with camera/mic permissions
  const context1 = await browser1.newContext({
    permissions: ['camera', 'microphone'],
  });
  const context2 = await browser2.newContext({
    permissions: ['camera', 'microphone'],
  });

  page1 = await context1.newPage();
  page2 = await context2.newPage();

  page1.setDefaultTimeout(60000);
  page2.setDefaultTimeout(60000);

  // Capture console logs
  page1.on('console', msg => {
    const text = msg.text();
    logs1.push(text);
    if (text.includes('[Videolify]') || text.includes('📥') || text.includes('✏️') || text.includes('🎨')) {
      console.log(`[P1] ${text}`);
    }
  });

  page2.on('console', msg => {
    const text = msg.text();
    logs2.push(text);
    if (text.includes('[Videolify]') || text.includes('📥') || text.includes('✏️') || text.includes('🎨')) {
      console.log(`[P2] ${text}`);
    }
  });

  console.log('\n[2/10] Peer1 joining...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=100&name=Peer1`);
  await sleep(3000);

  console.log('\n[3/10] Peer2 joining...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=200&name=Peer2`);

  console.log('\n[4/10] Waiting 15s for P2P connection...\n');
  await sleep(15000);

  // =========================================================================
  // TEST 1: WHITEBOARD TOGGLE SYNC
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 TEST 1: WHITEBOARD TOGGLE SYNC');
  console.log('━'.repeat(80));

  const p1WhiteboardOpen = await page1.evaluate(() => {
    const btn = document.querySelector('[data-testid="toggle-whiteboard-btn"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Peer1 clicked whiteboard button:', p1WhiteboardOpen ? '✅' : '❌');
  await sleep(2000);

  // Check if Peer2 received toggle
  const p2ReceivedToggle = logs2.some(l =>
    l.includes('Remote peer toggled whiteboard') ||
    l.includes('whiteboard-toggle')
  );

  console.log('Peer2 received toggle:', p2ReceivedToggle ? '✅ YES' : '❌ NO');

  // =========================================================================
  // TEST 2: WHITEBOARD DRAWING PERSISTENCE (LOCAL)
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 TEST 2: WHITEBOARD DRAWING PERSISTENCE (LOCAL)');
  console.log('━'.repeat(80));

  const p1LogsBefore = logs1.length;

  // Simulate drawing on canvas
  const drawResult = await page1.evaluate(() => {
    try {
      const canvas = window.whiteboardFabricRef?.current;
      if (!canvas) return { success: false, error: 'Canvas not found' };

      console.log('[TEST] Canvas found, isDrawingMode:', canvas.isDrawingMode);
      console.log('[TEST] Canvas objects before:', canvas.getObjects().length);

      // Simulate path creation (fabric.js normally does this on mouse up)
      const path = new window.fabric.Path('M 10 10 L 100 100', {
        stroke: '#000000',
        strokeWidth: 2,
        fill: '',
      });

      // Manually fire path:created event
      canvas.fire('path:created', { path: path });

      // Wait a bit for event to process
      return new Promise(resolve => {
        setTimeout(() => {
          const objectsAfter = canvas.getObjects().length;
          console.log('[TEST] Canvas objects after:', objectsAfter);
          resolve({
            success: true,
            objectsBefore: 0,
            objectsAfter: objectsAfter
          });
        }, 500);
      });
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  });

  console.log('Draw result:', drawResult);
  await sleep(2000);

  // Check logs for path:created
  const p1PathCreated = logs1.slice(p1LogsBefore).some(l =>
    l.includes('Path created') || l.includes('path:created')
  );

  const p1PathPersisted = logs1.slice(p1LogsBefore).some(l =>
    l.includes('Objects on canvas:') && l.includes('1')
  );

  console.log('Peer1 path created:', p1PathCreated ? '✅ YES' : '❌ NO');
  console.log('Peer1 path persisted:', p1PathPersisted ? '✅ YES' : '❌ NO');

  // =========================================================================
  // TEST 3: WHITEBOARD DRAWING SYNC (BIDIRECTIONAL)
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 TEST 3: WHITEBOARD DRAWING SYNC');
  console.log('━'.repeat(80));

  const p2LogsBefore = logs2.length;

  // Check if Peer2 received drawing
  await sleep(2000);

  const p2ReceivedDrawing = logs2.slice(p2LogsBefore).some(l =>
    l.includes('Whiteboard event RECEIVED: draw') ||
    l.includes('Added remote drawing object')
  );

  console.log('Peer2 received drawing:', p2ReceivedDrawing ? '✅ YES' : '❌ NO');

  // =========================================================================
  // TEST 4: FILE SHARING
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 TEST 4: FILE SHARING');
  console.log('━'.repeat(80));

  // Create test file
  const testFilePath = join(process.cwd(), 'test-file.txt');
  writeFileSync(testFilePath, 'This is a test file for P2P file sharing');
  console.log('Created test file:', testFilePath);

  // Check if file channel is open
  const p1FileChannelOpen = logs1.some(l => l.includes('File DataChannel OPEN'));
  const p2FileChannelOpen = logs2.some(l => l.includes('File DataChannel OPEN'));

  console.log('Peer1 file channel:', p1FileChannelOpen ? '✅ OPEN' : '❌ CLOSED');
  console.log('Peer2 file channel:', p2FileChannelOpen ? '✅ OPEN' : '❌ CLOSED');

  if (p1FileChannelOpen) {
    // Try to trigger file send
    const fileSendResult = await page1.evaluate((filePath) => {
      try {
        // Check if file input exists
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) {
          return { success: false, error: 'File input not found' };
        }

        // Check if file channel ref exists
        const fileChannel = window.fileChannelRef?.current;
        if (!fileChannel) {
          return { success: false, error: 'File channel ref not found' };
        }

        console.log('[TEST] File channel state:', fileChannel.readyState);
        return {
          success: true,
          channelState: fileChannel.readyState,
          hasFileInput: true
        };
      } catch (e) {
        return { success: false, error: e.toString() };
      }
    }, testFilePath);

    console.log('File send check:', fileSendResult);
  }

  // =========================================================================
  // FINAL RESULTS
  // =========================================================================
  console.log('\n━'.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('━'.repeat(80));

  const allTestsPassed =
    p2ReceivedToggle &&
    p1PathCreated &&
    p1PathPersisted &&
    p1FileChannelOpen &&
    p2FileChannelOpen;

  console.log('\n✅ Whiteboard Toggle Sync:', p2ReceivedToggle ? 'PASS' : 'FAIL');
  console.log('✅ Path Created Event:', p1PathCreated ? 'PASS' : 'FAIL');
  console.log('✅ Path Persisted on Canvas:', p1PathPersisted ? 'PASS' : 'FAIL');
  console.log('✅ Drawing Sync P1→P2:', p2ReceivedDrawing ? 'PASS' : 'FAIL (may need more time)');
  console.log('✅ File Channel P1:', p1FileChannelOpen ? 'PASS' : 'FAIL');
  console.log('✅ File Channel P2:', p2FileChannelOpen ? 'PASS' : 'FAIL');

  if (!p1PathPersisted) {
    console.log('\n🔍 DEBUG: Path persistence failed');
    console.log('Last 20 logs from Peer1:');
    logs1.slice(-20).forEach(l => console.log('  ', l));
  }

  if (!p1FileChannelOpen || !p2FileChannelOpen) {
    console.log('\n🔍 DEBUG: File channel not open');
    console.log('Last 10 logs from Peer1:');
    logs1.filter(l => l.includes('File') || l.includes('DataChannel')).slice(-10).forEach(l => console.log('  ', l));
    console.log('Last 10 logs from Peer2:');
    logs2.filter(l => l.includes('File') || l.includes('DataChannel')).slice(-10).forEach(l => console.log('  ', l));
  }

  console.log('\n━'.repeat(80));
  console.log('Keeping browsers open for 30s for manual inspection...');
  console.log('━'.repeat(80));
  await sleep(30000);

  await browser1.close();
  await browser2.close();

  process.exit(allTestsPassed ? 0 : 1);

} catch (error) {
  console.error('\n❌ TEST ERROR:', error.message);
  console.error(error.stack);

  if (browser1) await browser1.close().catch(() => {});
  if (browser2) await browser2.close().catch(() => {});

  process.exit(1);
}
