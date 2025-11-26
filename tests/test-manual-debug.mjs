#!/usr/bin/env node
/**
 * MANUAL DEBUG TEST - Keep browsers open to inspect console
 */

import puppeteer from 'puppeteer';

const ROOM = `debug-${Date.now()}`;
const BASE_URL = 'http://localhost:3001/test-videolify';
const TUTOR_URL = `${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor`;
const STUDENT_URL = `${BASE_URL}?room=${ROOM}&name=Student&role=student`;

(async () => {
  console.log('\n🔍 MANUAL DEBUG TEST');
  console.log('====================\n');
  console.log(`Room: ${ROOM}\n`);
  console.log('Tutor URL:', TUTOR_URL);
  console.log('Student URL:', STUDENT_URL);
  console.log('\n📝 Steps:');
  console.log('1. Wait for initial connection');
  console.log('2. Check console logs');
  console.log('3. Tutor F5 manually');
  console.log('4. Observe reconnection\n');

  const browserTutor = await puppeteer.launch({ 
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ]
  });
  
  const browserStudent = await puppeteer.launch({ 
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ]
  });

  const tutorPage = await browserTutor.newPage();
  const studentPage = await browserStudent.newPage();

  // Log all console messages
  tutorPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Videolify]') || text.includes('ERROR') || text.includes('peer-joined') || text.includes('remotePeerIdRef')) {
      console.log('🟦 TUTOR:', text);
    }
  });
  
  studentPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Videolify]') || text.includes('ERROR') || text.includes('peer-joined') || text.includes('remotePeerIdRef')) {
      console.log('🟩 STUDENT:', text);
    }
  });

  await tutorPage.goto(TUTOR_URL, { waitUntil: 'networkidle0' });
  console.log('\n✅ Tutor loaded - waiting 3s\n');
  await new Promise(r => setTimeout(r, 3000));
  
  await studentPage.goto(STUDENT_URL, { waitUntil: 'networkidle0' });
  console.log('\n✅ Student loaded - waiting for connection...\n');
  
  console.log('\n💡 Browsers are open. Check console and test manually!');
  console.log('   Press Ctrl+C to exit\n');

  // Keep alive
  await new Promise(() => {});
})();
