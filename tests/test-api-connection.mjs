/**
 * Test API Connection - Simple fetch test without Puppeteer
 */

const BASE_URL = 'http://localhost:3001';
const ROOM_ID = `test-${Date.now()}`;

console.log('🧪 Testing API Connection...\n');

async function testJoinRoom(userId, userName, role) {
  const peerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const accessToken = `test-token-${userId}`;

  console.log(`[${userName}] Testing join room...`);
  console.log(`   Room ID: ${ROOM_ID}`);
  console.log(`   Peer ID: ${peerId}`);
  console.log(`   Role: ${role}\n`);

  try {
    // Test join endpoint
    const joinResponse = await fetch(`${BASE_URL}/api/videolify/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        roomId: ROOM_ID,
        peerId,
        accessToken,
        data: { userName, role },
      }),
    });

    if (!joinResponse.ok) {
      console.error(`[${userName}] ❌ Join failed: ${joinResponse.status}`);
      const text = await joinResponse.text();
      console.error(`   Response: ${text}`);
      return null;
    }

    const joinData = await joinResponse.json();
    console.log(`[${userName}] ✅ Joined successfully`);
    console.log(`   Existing peers: ${JSON.stringify(joinData.existingPeers || [])}\n`);

    return { peerId, accessToken, joinData };
  } catch (err) {
    console.error(`[${userName}] ❌ Error:`, err.message);
    return null;
  }
}

async function testSSEConnection(peerId, accessToken, userName) {
  return new Promise(async (resolve) => {
    console.log(`[${userName}] Testing SSE connection...`);

    const url = `${BASE_URL}/api/videolify/stream?roomId=${ROOM_ID}&peerId=${peerId}&accessToken=${accessToken}`;

    try {
      const EventSource = (await import('eventsource')).default;
      const es = new EventSource(url);

      const events = [];
      let connected = false;

      es.addEventListener('connected', () => {
        console.log(`[${userName}] ✅ SSE connected\n`);
        connected = true;
      });

      es.addEventListener('peer-joined', (e) => {
        const data = JSON.parse(e.data);
        console.log(`[${userName}] 📥 peer-joined: ${data.peerId}`);
        events.push({ type: 'peer-joined', peerId: data.peerId });
      });

      es.addEventListener('offer', (e) => {
        const data = JSON.parse(e.data);
        console.log(`[${userName}] 📥 offer from: ${data.fromPeerId}`);
        events.push({ type: 'offer', fromPeerId: data.fromPeerId });
      });

      es.addEventListener('answer', (e) => {
        const data = JSON.parse(e.data);
        console.log(`[${userName}] 📥 answer from: ${data.fromPeerId}`);
        events.push({ type: 'answer', fromPeerId: data.fromPeerId });
      });

      es.onerror = (err) => {
        console.error(`[${userName}] ❌ SSE error:`, err.message);
        es.close();
        resolve({ connected, events, error: err.message });
      };

      // Close after 15 seconds
      setTimeout(() => {
        es.close();
        console.log(`[${userName}] 🔌 SSE closed\n`);
        resolve({ connected, events, error: null });
      }, 15000);

    } catch (err) {
      console.error(`[${userName}] ❌ SSE setup error:`, err.message);
      resolve({ connected: false, events: [], error: err.message });
    }
  });
}

async function runTest() {
  console.log('📋 Test Plan:');
  console.log('1. Tutor joins room');
  console.log('2. Student joins room');
  console.log('3. Check SSE events for both peers');
  console.log('4. Verify no duplicate peer-joined events\n');
  console.log('='.repeat(60) + '\n');

  // Test 1: Tutor joins
  const tutor = await testJoinRoom(1, 'Tutor', 'tutor');
  if (!tutor) {
    console.error('❌ Tutor failed to join');
    return false;
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Student joins
  const student = await testJoinRoom(2, 'Student', 'student');
  if (!student) {
    console.error('❌ Student failed to join');
    return false;
  }

  console.log('⏳ Monitoring SSE events for 15 seconds...\n');

  // Test 3: Monitor SSE events
  const [tutorSSE, studentSSE] = await Promise.all([
    testSSEConnection(tutor.peerId, tutor.accessToken, 'Tutor'),
    testSSEConnection(student.peerId, student.accessToken, 'Student'),
  ]);

  // Analyze results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));

  console.log('\n[Tutor] SSE Results:');
  console.log(`   Connected: ${tutorSSE.connected ? '✅' : '❌'}`);
  console.log(`   Events received: ${tutorSSE.events.length}`);
  console.log(`   Events: ${JSON.stringify(tutorSSE.events, null, 2)}`);

  console.log('\n[Student] SSE Results:');
  console.log(`   Connected: ${studentSSE.connected ? '✅' : '❌'}`);
  console.log(`   Events received: ${studentSSE.events.length}`);
  console.log(`   Events: ${JSON.stringify(studentSSE.events, null, 2)}`);

  // Check for duplicate peer-joined events
  const tutorPeerJoined = tutorSSE.events.filter(e => e.type === 'peer-joined');
  const studentPeerJoined = studentSSE.events.filter(e => e.type === 'peer-joined');

  console.log('\n🔍 Duplicate Check:');

  // Check tutor's peer-joined events
  const tutorPeerIds = tutorPeerJoined.map(e => e.peerId);
  const tutorUniquePeers = new Set(tutorPeerIds);
  const tutorHasDuplicates = tutorPeerIds.length !== tutorUniquePeers.size;

  console.log(`   Tutor peer-joined events: ${tutorPeerIds.length}`);
  console.log(`   Unique peers: ${tutorUniquePeers.size}`);
  console.log(`   Has duplicates: ${tutorHasDuplicates ? '❌ YES' : '✅ NO'}`);

  // Check student's peer-joined events
  const studentPeerIds = studentPeerJoined.map(e => e.peerId);
  const studentUniquePeers = new Set(studentPeerIds);
  const studentHasDuplicates = studentPeerIds.length !== studentUniquePeers.size;

  console.log(`   Student peer-joined events: ${studentPeerIds.length}`);
  console.log(`   Unique peers: ${studentUniquePeers.size}`);
  console.log(`   Has duplicates: ${studentHasDuplicates ? '❌ YES' : '✅ NO'}`);

  console.log('\n' + '='.repeat(60));

  const passed =
    tutorSSE.connected &&
    studentSSE.connected &&
    !tutorHasDuplicates &&
    !studentHasDuplicates &&
    tutorPeerJoined.length > 0 &&
    studentPeerJoined.length === 0; // Student should see tutor already in existingPeers

  if (passed) {
    console.log('\n✅ TEST PASSED');
    console.log('   - Both peers connected via SSE');
    console.log('   - No duplicate peer-joined events');
    console.log('   - Tutor received peer-joined for student');
  } else {
    console.log('\n❌ TEST FAILED');
    if (!tutorSSE.connected || !studentSSE.connected) {
      console.log('   - SSE connection failed');
    }
    if (tutorHasDuplicates || studentHasDuplicates) {
      console.log('   - Duplicate peer-joined events detected');
    }
    if (tutorPeerJoined.length === 0) {
      console.log('   - Tutor did not receive peer-joined event');
    }
  }

  return passed;
}

// Check if eventsource is installed
try {
  await import('eventsource');
} catch (err) {
  console.error('❌ eventsource package not found. Installing...\n');
  console.log('Run: npm install eventsource\n');
  process.exit(1);
}

runTest()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
