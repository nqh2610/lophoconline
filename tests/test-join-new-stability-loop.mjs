import { chromium } from 'playwright';
import fs from 'fs';

const baseUrl = 'http://localhost:3000/test-videolify-v2';
const ROOM = `autojoin-loop-${Date.now()}`;
const ITERATIONS = 10;
const WAIT_AFTER_JOIN_MS = 6000;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function openPage(browser, role, name, headlessLog = false) {
  const page = await browser.newPage();
  page.__logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('SSE') || text.includes('Connection state') || text.includes('Peer joined') || text.includes('Offer') || text.includes('Answer') || text.includes('DataChannel') || text.includes('ICE') || text.includes('[useSignaling]') || text.includes('[VideolifyFull_v2]')) {
      page.__logs.push(text);
    }
  });

  await page.goto(`${baseUrl}?room=${ROOM}&name=${encodeURIComponent(name)}&role=${role}`, { waitUntil: 'load', timeout: 20000 }).catch(() => {});
  return page;
}

async function checkConnected(page) {
  const logs = await page.evaluate(() => window.__videolifyLogs || []);
  const consoleLogs = page.__logs || [];
  const combined = [...logs, ...consoleLogs].join('\n');
  const sseOk = /SSE connected|SSE onopen|SSE connected successfully/i.test(combined);
  const connected = /Connection state: connected|connectionState: connected/i.test(combined);
  const dbg = await page.evaluate(() => {
    try { return !!(window.__VIDEOLIFY_DEBUG__?.peerConnection?.connectionState === 'connected'); } catch (e) { return false; }
  }).catch(() => false);
  return { sseOk, connected: connected || dbg, combined, logs: consoleLogs };
}

async function runLoop() {
  console.log('🔬 Loop test for join-new stability');
  console.log('Room:', ROOM);
  console.log('Iterations:', ITERATIONS);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const results = [];

  try {
    const tutor = await openPage(browser, 'tutor', 'Tutor');
    await delay(2500);

    for (let i = 0; i < ITERATIONS; i++) {
      console.log(`\n--- Iteration ${i + 1}/${ITERATIONS} ---`);
      const studentName = `Student-${i + 1}`;
      let student = await openPage(browser, 'student', studentName);
      await delay(WAIT_AFTER_JOIN_MS);

      const r1 = await checkConnected(student);
      console.log(` First join: sseOk=${r1.sseOk} connected=${r1.connected}`);

      let reopenSuccess = false;

      if (!r1.connected) {
        // simulate user closing tab then opening new one
        await student.close();
        await delay(800);
        const reopened = await openPage(browser, 'student', `${studentName}-reopen`);
        await delay(WAIT_AFTER_JOIN_MS);
        const r2 = await checkConnected(reopened);
        reopenSuccess = r2.connected;
        console.log(` Reopen: sseOk=${r2.sseOk} connected=${r2.connected}`);
        await reopened.close().catch(() => {});
      } else {
        // close student to keep resource usage low
        await student.close().catch(() => {});
      }

      results.push({ iteration: i + 1, firstConnected: r1.connected, firstSseOk: r1.sseOk, reopenSuccess });

      // small pause between iterations
      await delay(500);
    }

    // summarize
    const total = results.length;
    const firstSuccess = results.filter(r => r.firstConnected).length;
    const reopenFixed = results.filter(r => !r.firstConnected && r.reopenSuccess).length;
    const firstFail = total - firstSuccess;

    const summary = {
      total,
      firstSuccess,
      firstFail,
      reopenFixed,
      reopenRateAmongFails: firstFail === 0 ? 0 : (reopenFixed / firstFail)
    };

    const out = { ROOM, SUMMARY: summary, RESULTS: results };
    fs.writeFileSync('test-join-new-stability-loop-result.json', JSON.stringify(out, null, 2));

    console.log('\n=== SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));

    await browser.close();
    return out;
  } catch (err) {
    console.error('Test loop error:', err);
    try { await browser.close(); } catch (e) {}
    throw err;
  }
}

(async () => {
  try {
    const res = await runLoop();
    console.log('\nSaved results to test-join-new-stability-loop-result.json');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
