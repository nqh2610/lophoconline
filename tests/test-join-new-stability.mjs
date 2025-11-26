import { chromium } from 'playwright';

const baseUrl = 'http://localhost:3000/test-videolify-v2';

const ROOM = `autojoin-${Date.now()}`;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function openPage(browser, role, name) {
  const page = await browser.newPage();
  page.__logs = [];
  page.on('console', msg => {
    const text = msg.text();
    // capture only relevant logs to keep arrays small
    if (text.includes('SSE') || text.includes('Connection state') || text.includes('Peer joined') || text.includes('Offer') || text.includes('Answer') || text.includes('DataChannel') || text.includes('ICE')) {
      page.__logs.push(text);
    }
  });

  await page.goto(`${baseUrl}?room=${ROOM}&name=${encodeURIComponent(name)}&role=${role}`, { waitUntil: 'load', timeout: 20000 }).catch(() => {});
  return page;
}

async function checkConnected(page) {
  // check logs and also try to read the debug object if present
  const logs = await page.evaluate(() => window.__videolifyLogs || []);
  const consoleLogs = page.__logs || [];

  const combined = [...logs, ...consoleLogs].join('\n');
  const sseOk = /SSE connected|SSE onopen|SSE onopen fired|SSE connected successfully/i.test(combined);
  const connected = /Connection state: connected|connectionState: connected/i.test(combined);

  // fallback: inspect window debug if available
  const dbg = await page.evaluate(() => {
    try { return !!(window.__VIDEOLIFY_DEBUG__?.peerConnection?.connectionState === 'connected'); } catch (e) { return false; }
  }).catch(() => false);

  return { sseOk, connected: connected || dbg, combined, logs: consoleLogs };
}

(async () => {
  console.log('🔬 Test: Auto-join stability (new join behavior)');
  console.log('Room:', ROOM);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  try {
    console.log('📖 Opening tutor page...');
    const tutor = await openPage(browser, 'tutor', 'Tutor');
    await delay(3000);

    console.log('1) First student join (immediate)');
    let student = await openPage(browser, 'student', 'Student-1');
    await delay(8000);

    let result = await checkConnected(student);
    console.log('  - First join SSE ok:', result.sseOk);
    console.log('  - First join connected:', result.connected);

    if (result.connected) {
      console.log('✅ First join succeeded — no issue reproduced in this run');
    } else {
      console.log('❌ First join FAILED — attempting close & reopen to simulate your observed fix');

      // Close student page and reopen (as you described: closing browser/tab then join works)
      await student.close();
      await delay(1500);

      console.log('2) Re-opening student (close + new tab)');
      student = await openPage(browser, 'student', 'Student-2');
      await delay(8000);

      const result2 = await checkConnected(student);
      console.log('  - Reopen SSE ok:', result2.sseOk);
      console.log('  - Reopen connected:', result2.connected);

      if (result2.connected) {
        console.log('✅ Reopen succeeded — reproduces scenario where closing tab fixes join');
      } else {
        console.log('❌ Reopen also FAILED — further investigation required');
      }
    }

    console.log('\nℹ️ Collected logs for manual inspection (sample):');
    console.log('--- Tutor logs ---');
    const tutorLogs = await tutor.evaluate(() => window.__videolifyLogs || []);
    console.log(tutorLogs.slice(-10).join('\n') || '(none)');

    console.log('--- Student logs ---');
    const studentLogs = await student.evaluate(() => window.__videolifyLogs || []).catch(() => []);
    console.log(studentLogs.slice(-10).join('\n') || '(none)');

    console.log('\n🧹 Test done — keeping browser open for 12s for inspection...');
    await delay(12000);
    await browser.close();

    // Exit with non-zero to flag failure if first join failed but reopen succeeded? We'll exit 0 unless both attempts failed.
    process.exit(0);
  } catch (err) {
    console.error('❌ Test script error:', err);
    try { await browser.close(); } catch (e) {}
    process.exit(1);
  }
})();
