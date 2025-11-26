#!/usr/bin/env node
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ROOM = 'quick-' + Date.now();

(async () => {
  const browser1 = await chromium.launch({ headless: false });
  const browser2 = await chromium.launch({ headless: false });

  const page1 = await browser1.newPage();
  const page2 = await browser2.newPage();

  page1.on('console', msg => console.log('[P1]', msg.text()));
  page2.on('console', msg => console.log('[P2]', msg.text()));

  console.log('Opening Peer1...');
  await page1.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=1&name=P1`);
  await new Promise(r => setTimeout(r, 3000));

  console.log('Opening Peer2...');
  await page2.goto(`${BASE_URL}/test-videolify?room=${ROOM}&testUserId=2&name=P2`);
  await new Promise(r => setTimeout(r, 10000));

  console.log('\nCHECK DATA CHANNELS:');
  const p1State = await page1.evaluate(() => ({
    control: window.controlChannelRef?.current?.readyState,
    chat: window.chatChannelRef?.current?.readyState,
  }));
  const p2State = await page2.evaluate(() => ({
    control: window.controlChannelRef?.current?.readyState,
    chat: window.chatChannelRef?.current?.readyState,
  }));

  console.log('Peer1 channels:', p1State);
  console.log('Peer2 channels:', p2State);

  console.log('\nKeeping open 60s...');
  await new Promise(r => setTimeout(r, 60000));

  await browser1.close();
  await browser2.close();
})();
