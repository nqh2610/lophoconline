#!/usr/bin/env node
/**
 * TEST CONNECTION TIMING - Measure each step
 * Find bottlenecks in connection establishment
 */

import puppeteer from 'puppeteer';

const ROOM = `timing-${Date.now()}`;
const BASE_URL = 'http://localhost:3000/test-videolify';
const TUTOR_URL = `${BASE_URL}?room=${ROOM}&name=Tutor&role=tutor`;
const STUDENT_URL = `${BASE_URL}?room=${ROOM}&name=Student&role=student`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('⏱️  CONNECTION TIMING TEST\n');
  console.log('Measuring each step of connection process...\n');

  let browserTutor, browserStudent;

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

    // Track timing events
    const timings = {
      tutor: {},
      student: {}
    };

    // Capture console logs with timing
    tutorPage.on('console', msg => {
      const text = msg.text();
      const now = Date.now();
      
      // Track key events
      if (text.includes('📹 Requesting media access')) {
        timings.tutor.mediaRequestStart = now;
        console.log(`🟦 [${now}] Tutor: Media request started`);
      } else if (text.includes('✅ Local media initialized')) {
        timings.tutor.mediaReady = now;
        const elapsed = now - (timings.tutor.mediaRequestStart || now);
        console.log(`🟦 [${now}] Tutor: Media ready (+${elapsed}ms)`);
      } else if (text.includes('🚪 Joining room')) {
        timings.tutor.joinStart = now;
        console.log(`🟦 [${now}] Tutor: Join room started`);
      } else if (text.includes('✅ Joined room successfully')) {
        timings.tutor.joinComplete = now;
        const elapsed = now - (timings.tutor.joinStart || now);
        console.log(`🟦 [${now}] Tutor: Joined room (+${elapsed}ms)`);
      } else if (text.includes('Creating and sending offer')) {
        timings.tutor.offerStart = now;
        console.log(`🟦 [${now}] Tutor: Creating offer...`);
      } else if (text.includes('Offer sent to:')) {
        timings.tutor.offerSent = now;
        const elapsed = now - (timings.tutor.offerStart || now);
        console.log(`🟦 [${now}] Tutor: Offer sent (+${elapsed}ms)`);
      } else if (text.includes('ICE gathering state: gathering')) {
        timings.tutor.iceGatheringStart = now;
        console.log(`🟦 [${now}] Tutor: ICE gathering started`);
      } else if (text.includes('ICE gathering state: complete')) {
        timings.tutor.iceGatheringComplete = now;
        const elapsed = now - (timings.tutor.iceGatheringStart || now);
        console.log(`🟦 [${now}] Tutor: ICE gathering complete (+${elapsed}ms)`);
      } else if (text.includes('ICE connection state: connected')) {
        timings.tutor.iceConnected = now;
        console.log(`🟦 [${now}] Tutor: ICE connected`);
      } else if (text.includes('✅ P2P Connection Established')) {
        timings.tutor.p2pEstablished = now;
        console.log(`🟦 [${now}] Tutor: ✅ P2P ESTABLISHED`);
      }
    });

    studentPage.on('console', msg => {
      const text = msg.text();
      const now = Date.now();
      
      if (text.includes('📹 Requesting media access')) {
        timings.student.mediaRequestStart = now;
        console.log(`🟩 [${now}] Student: Media request started`);
      } else if (text.includes('✅ Local media initialized')) {
        timings.student.mediaReady = now;
        const elapsed = now - (timings.student.mediaRequestStart || now);
        console.log(`🟩 [${now}] Student: Media ready (+${elapsed}ms)`);
      } else if (text.includes('🚪 Joining room')) {
        timings.student.joinStart = now;
        console.log(`🟩 [${now}] Student: Join room started`);
      } else if (text.includes('✅ Joined room successfully')) {
        timings.student.joinComplete = now;
        const elapsed = now - (timings.student.joinStart || now);
        console.log(`🟩 [${now}] Student: Joined room (+${elapsed}ms)`);
      } else if (text.includes('Received offer from peer')) {
        timings.student.offerReceived = now;
        console.log(`🟩 [${now}] Student: Received offer`);
      } else if (text.includes('Creating answer')) {
        timings.student.answerStart = now;
        console.log(`🟩 [${now}] Student: Creating answer...`);
      } else if (text.includes('Answer sent to signaling server')) {
        timings.student.answerSent = now;
        const elapsed = now - (timings.student.answerStart || now);
        console.log(`🟩 [${now}] Student: Answer sent (+${elapsed}ms)`);
      } else if (text.includes('ICE gathering state: gathering')) {
        timings.student.iceGatheringStart = now;
        console.log(`🟩 [${now}] Student: ICE gathering started`);
      } else if (text.includes('ICE gathering state: complete')) {
        timings.student.iceGatheringComplete = now;
        const elapsed = now - (timings.student.iceGatheringStart || now);
        console.log(`🟩 [${now}] Student: ICE gathering complete (+${elapsed}ms)`);
      } else if (text.includes('ICE connection state: connected')) {
        timings.student.iceConnected = now;
        console.log(`🟩 [${now}] Student: ICE connected`);
      } else if (text.includes('✅ P2P Connection Established')) {
        timings.student.p2pEstablished = now;
        console.log(`🟩 [${now}] Student: ✅ P2P ESTABLISHED`);
      }
    });

    // Load tutor first
    const t0 = Date.now();
    console.log(`\n[${t0}] Loading Tutor...`);
    await tutorPage.goto(TUTOR_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log(`[${Date.now()}] Tutor page loaded\n`);

    await sleep(3000);

    // Load student
    console.log(`\n[${Date.now()}] Loading Student...`);
    await studentPage.goto(STUDENT_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log(`[${Date.now()}] Student page loaded\n`);

    // Wait for connection
    console.log('\nWaiting for connection to establish...\n');
    await sleep(15000);

    // Calculate totals
    const tEnd = Date.now();
    const totalTime = tEnd - t0;

    console.log('\n\n📊 TIMING ANALYSIS');
    console.log('===========================================\n');

    console.log('🟦 TUTOR:');
    if (timings.tutor.mediaReady && timings.tutor.mediaRequestStart) {
      console.log(`  Media: ${timings.tutor.mediaReady - timings.tutor.mediaRequestStart}ms`);
    }
    if (timings.tutor.joinComplete && timings.tutor.joinStart) {
      console.log(`  Join: ${timings.tutor.joinComplete - timings.tutor.joinStart}ms`);
    }
    if (timings.tutor.offerSent && timings.tutor.offerStart) {
      console.log(`  Create Offer: ${timings.tutor.offerSent - timings.tutor.offerStart}ms`);
    }
    if (timings.tutor.iceGatheringComplete && timings.tutor.iceGatheringStart) {
      console.log(`  ICE Gathering: ${timings.tutor.iceGatheringComplete - timings.tutor.iceGatheringStart}ms`);
    }
    if (timings.tutor.p2pEstablished && timings.tutor.offerStart) {
      console.log(`  Offer → P2P: ${timings.tutor.p2pEstablished - timings.tutor.offerStart}ms`);
    }

    console.log('\n🟩 STUDENT:');
    if (timings.student.mediaReady && timings.student.mediaRequestStart) {
      console.log(`  Media: ${timings.student.mediaReady - timings.student.mediaRequestStart}ms`);
    }
    if (timings.student.joinComplete && timings.student.joinStart) {
      console.log(`  Join: ${timings.student.joinComplete - timings.student.joinStart}ms`);
    }
    if (timings.student.answerSent && timings.student.answerStart) {
      console.log(`  Create Answer: ${timings.student.answerSent - timings.student.answerStart}ms`);
    }
    if (timings.student.iceGatheringComplete && timings.student.iceGatheringStart) {
      console.log(`  ICE Gathering: ${timings.student.iceGatheringComplete - timings.student.iceGatheringStart}ms`);
    }
    if (timings.student.p2pEstablished && timings.student.offerReceived) {
      console.log(`  Offer Received → P2P: ${timings.student.p2pEstablished - timings.student.offerReceived}ms`);
    }

    console.log(`\n⏱️  TOTAL: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);

    // Identify bottlenecks
    console.log('\n\n🔍 BOTTLENECK ANALYSIS:');
    console.log('===========================================\n');

    const bottlenecks = [];

    const tutorICETime = timings.tutor.iceGatheringComplete - timings.tutor.iceGatheringStart;
    const studentICETime = timings.student.iceGatheringComplete - timings.student.iceGatheringStart;

    if (tutorICETime > 2000) {
      bottlenecks.push(`⚠️  Tutor ICE gathering slow: ${tutorICETime}ms (should be <2s)`);
    }
    if (studentICETime > 2000) {
      bottlenecks.push(`⚠️  Student ICE gathering slow: ${studentICETime}ms (should be <2s)`);
    }

    const tutorOfferTime = timings.tutor.offerSent - timings.tutor.offerStart;
    if (tutorOfferTime > 500) {
      bottlenecks.push(`⚠️  Tutor offer creation slow: ${tutorOfferTime}ms (should be <500ms)`);
    }

    const studentAnswerTime = timings.student.answerSent - timings.student.answerStart;
    if (studentAnswerTime > 500) {
      bottlenecks.push(`⚠️  Student answer creation slow: ${studentAnswerTime}ms (should be <500ms)`);
    }

    if (bottlenecks.length === 0) {
      console.log('✅ No significant bottlenecks detected!');
    } else {
      bottlenecks.forEach(b => console.log(b));
    }

    console.log('\n💡 Browsers left open for inspection');
    console.log('   Press Ctrl+C to exit\n');

    // Keep alive
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
