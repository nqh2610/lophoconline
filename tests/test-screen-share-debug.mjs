import puppeteer from 'puppeteer';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testScreenShareDebug() {
  console.log('\n🔍 DEBUGGING SCREEN SHARE FLOW\n');
  
  let tutor, student;
  
  try {
    // Launch browsers
    tutor = await puppeteer.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--auto-accept-camera-and-microphone-capture'
      ]
    });
    
    student = await puppeteer.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--auto-accept-camera-and-microphone-capture'
      ]
    });

    const tutorPage = await tutor.newPage();
    const studentPage = await student.newPage();

    // Enable console logging
    tutorPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[VBG]') || text.includes('screen') || text.includes('📺')) {
        console.log('🟦 TUTOR:', text);
      }
    });

    studentPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[VBG]') || text.includes('screen') || text.includes('📺') || text.includes('ontrack')) {
        console.log('🟩 STUDENT:', text);
      }
    });

    const roomId = `debug-share-${Date.now()}`;

    console.log('1️⃣ Teacher joining room...');
    await tutorPage.goto(`${BASE_URL}/test-videolify?roomId=${roomId}&userId=teacher&userName=Teacher&role=tutor`);
    await sleep(3000);

    console.log('2️⃣ Student joining room...');
    await studentPage.goto(`${BASE_URL}/test-videolify?roomId=${roomId}&userId=student&userName=Student&role=student`);
    await sleep(5000);

    console.log('\n3️⃣ Checking initial connection...');
    const tutorConnected = await tutorPage.evaluate(() => {
      const status = document.querySelector('[class*="status"]');
      return status?.textContent || 'unknown';
    });
    console.log('Teacher status:', tutorConnected);

    const studentConnected = await studentPage.evaluate(() => {
      const status = document.querySelector('[class*="status"]');
      return status?.textContent || 'unknown';
    });
    console.log('Student status:', studentConnected);

    console.log('\n4️⃣ Teacher starting screen share...');
    console.log('⏳ Waiting for screen share button...');
    
    // Click screen share button
    await tutorPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const shareBtn = buttons.find(b => 
        b.textContent.includes('Share') || 
        b.querySelector('svg')
      );
      if (shareBtn) {
        console.log('🔵 Clicking screen share button');
        shareBtn.click();
      } else {
        console.log('❌ Screen share button not found');
      }
    });

    await sleep(2000);

    console.log('\n5️⃣ Checking teacher state after share...');
    const tutorState = await tutorPage.evaluate(() => {
      const video = document.querySelector('video');
      const track = video?.srcObject?.getVideoTracks()[0];
      return {
        hasVideo: !!video,
        hasSrcObject: !!video?.srcObject,
        trackLabel: track?.label || 'none',
        isScreenShare: track?.label?.includes('screen') || false
      };
    });
    console.log('Teacher video state:', tutorState);

    await sleep(3000);

    console.log('\n6️⃣ Checking student state (receiving screen)...');
    const studentState = await studentPage.evaluate(() => {
      const remoteVideo = document.querySelector('video[data-peer-id]') || 
                         Array.from(document.querySelectorAll('video')).find(v => 
                           v !== document.querySelector('video[autoplay][muted][playsInline]')
                         );
      
      const track = remoteVideo?.srcObject?.getVideoTracks()[0];
      
      // Check for VBG processor
      const hasVbgProcessor = window.vbgProcessor || false;
      
      // Check remoteOriginalStreamRef
      const hasOriginalStream = !!remoteVideo?.srcObject;
      
      return {
        hasRemoteVideo: !!remoteVideo,
        hasSrcObject: !!remoteVideo?.srcObject,
        trackLabel: track?.label || 'none',
        isScreenShare: track?.label?.includes('screen') || false,
        videoClass: remoteVideo?.className || 'none',
        hasVbgProcessor,
        streamId: remoteVideo?.srcObject?.id || 'none',
        trackCount: remoteVideo?.srcObject?.getVideoTracks().length || 0
      };
    });
    console.log('Student video state:', studentState);

    console.log('\n7️⃣ Checking for VBG on student side...');
    const vbgInfo = await studentPage.evaluate(() => {
      // Check localStorage
      const vbgSettings = Object.keys(localStorage).filter(k => k.includes('vbg'));
      
      // Check if VBG is being applied
      const canvas = document.querySelector('canvas');
      
      return {
        vbgKeysInStorage: vbgSettings,
        hasCanvas: !!canvas,
        canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'none'
      };
    });
    console.log('VBG info:', vbgInfo);

    console.log('\n8️⃣ Detailed track inspection on student...');
    const detailedTrackInfo = await studentPage.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.map((v, i) => ({
        index: i,
        id: v.id || 'no-id',
        className: v.className,
        hasSrcObject: !!v.srcObject,
        tracks: v.srcObject?.getVideoTracks().map(t => ({
          id: t.id,
          label: t.label,
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState
        })) || []
      }));
    });
    console.log('All videos on student:', JSON.stringify(detailedTrackInfo, null, 2));

    console.log('\n⏳ Keeping browsers open for manual inspection...');
    console.log('Press Ctrl+C to close');
    
    await sleep(300000); // 5 minutes

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (tutor) await tutor.close();
    if (student) await student.close();
  }
}

testScreenShareDebug();
