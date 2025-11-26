#!/usr/bin/env node
/**
 * SIMPLE TIMING TEST - Just measure total connection time
 * Then manually inspect browser console for details
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const ROOM = `timing-${Date.now()}`;
const BASE_URL = 'http://localhost:3000/test-videolify';
const TUTOR_URL = `${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor`;
const STUDENT_URL = `${BASE_URL}?room=${ROOM}&name=Student&role=student`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const checkConnected = async (page) => {
  try {
    const connected = await page.evaluate(() => {
      const indicator = document.querySelector('[data-testid="connection-indicator"]');
      return indicator && indicator.getAttribute('data-connected') === 'true';
    });
    return connected;
  } catch (e) {
    return false;
  }
};

const waitForConnection = async (page, timeout = 20000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await checkConnected(page)) {
      return Date.now() - start;
    }
    await sleep(200);
  }
  throw new Error('Connection timeout');
};

(async () => {
  console.log('⏱️  SIMPLE TIMING TEST\n');

  let browserTutor, browserStudent;
  const allLogs = [];

  try {
    // Launch browsers
    browserTutor = await puppeteer.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });
    
    browserStudent = await puppeteer.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });

    const tutorPage = await browserTutor.newPage();
    const studentPage = await browserStudent.newPage();

    // Capture ALL console logs
    tutorPage.on('console', msg => {
      const log = `🟦 TUTOR [${Date.now()}]: ${msg.text()}`;
      allLogs.push(log);
      // Only print key events to console
      if (msg.text().includes('[Videolify]')) {
        console.log(log);
      }
    });

    studentPage.on('console', msg => {
      const log = `🟩 STUDENT [${Date.now()}]: ${msg.text()}`;
      allLogs.push(log);
      // Only print key events to console
      if (msg.text().includes('[Videolify]')) {
        console.log(log);
      }
    });

    // Load tutor
    const t0 = Date.now();
    console.log(`\n[${t0}] Loading Tutor...`);
    await tutorPage.goto(TUTOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[${Date.now()}] Tutor loaded`);

    await sleep(2000);

    // Load student
    console.log(`\n[${Date.now()}] Loading Student...`);
    await studentPage.goto(STUDENT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[${Date.now()}] Student loaded`);

    // Wait for connection
    try {
      const connectTime = await waitForConnection(tutorPage, 20000);
      const tEnd = Date.now();
      const totalTime = tEnd - t0;

      console.log(`\n✅ Connected in ${connectTime}ms`);
      console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)\n`);

      // Save all logs to file
      fs.writeFileSync('test-timing-logs.txt', allLogs.join('\n'));
      console.log('📝 Full logs saved to test-timing-logs.txt');

    } catch (e) {
      console.log(`\n❌ FAILED: ${e.message}\n`);
      // Save logs even on failure
      fs.writeFileSync('test-timing-logs.txt', allLogs.join('\n'));
      console.log('📝 Full logs saved to test-timing-logs.txt');
    }

    console.log('\n💡 Browsers left open - check console for timing details');
    console.log('   Press Ctrl+C to exit\n');

    // Keep alive
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    // Save logs on error
    if (allLogs.length > 0) {
      fs.writeFileSync('test-timing-logs.txt', allLogs.join('\n'));
    }
    process.exit(1);
  }
})();
