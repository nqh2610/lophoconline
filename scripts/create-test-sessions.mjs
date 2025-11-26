#!/usr/bin/env node
/**
 * Script tạo video call sessions để test prejoin và VideolifyFull_v2
 * Chạy: node scripts/create-test-sessions.mjs
 */

import mysql from 'mysql2/promise';
import crypto from 'crypto';

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '', // Thay password nếu có
  database: 'lophoc_online'
};

async function createTestSessions() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected!\n');

    // 1. Xóa session test cũ
    console.log('🗑️  Cleaning old test sessions...');
    await connection.execute(`DELETE FROM video_call_sessions WHERE roomName LIKE 'test-%'`);
    await connection.execute(`DELETE FROM transactions WHERE lessonId IN (SELECT id FROM lessons WHERE subject LIKE 'Test Video Call%')`);
    await connection.execute(`DELETE FROM lessons WHERE subject LIKE 'Test Video Call%'`);
    console.log('✅ Cleaned!\n');

    // 2. Lấy tutor và student
    console.log('👤 Getting tutor and student...');
    const [tutors] = await connection.execute('SELECT id, userId FROM tutors ORDER BY createdAt DESC LIMIT 1');
    const [students] = await connection.execute('SELECT id, userId FROM students ORDER BY createdAt DESC LIMIT 1');
    
    if (!tutors.length || !students.length) {
      throw new Error('❌ No tutor or student found! Please create accounts first.');
    }

    const { id: tutorId, userId: tutorUserId } = tutors[0];
    const { id: studentId, userId: studentUserId } = students[0];
    console.log(`✅ Tutor ID: ${tutorId}, Student ID: ${studentId}\n`);

    // 3. Tạo sessions
    const sessions = [
      {
        name: 'Live Now - Đang diễn ra',
        subject: 'Test Video Call - Live Now',
        startOffset: -5, // Bắt đầu 5 phút trước
        endOffset: 55,   // Kết thúc sau 55 phút
        type: 'trial',
        price: 0
      },
      {
        name: 'Trong 10 phút',
        subject: 'Test Video Call - In 10 min',
        startOffset: 10,
        endOffset: 70,
        type: 'regular',
        price: 100000
      },
      {
        name: 'Trong 1 giờ',
        subject: 'Test Video Call - In 1 hour',
        startOffset: 60,
        endOffset: 120,
        type: 'regular',
        price: 150000
      }
    ];

    const results = [];

    for (const session of sessions) {
      console.log(`📝 Creating session: ${session.name}...`);

      const now = new Date();
      const startTime = new Date(now.getTime() + session.startOffset * 60000);
      const endTime = new Date(now.getTime() + session.endOffset * 60000);

      // Format times
      const dateStr = startTime.toISOString().split('T')[0];
      const startTimeStr = startTime.toTimeString().split(' ')[0];
      const endTimeStr = endTime.toTimeString().split(' ')[0];

      // Create lesson
      const [lessonResult] = await connection.execute(`
        INSERT INTO lessons (
          tutorId, studentId, subject, date, startTime, endTime,
          type, status, totalPrice, isTrial, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, NOW(), NOW())
      `, [
        tutorId, studentId, session.subject, dateStr, startTimeStr, endTimeStr,
        session.type, session.price, session.type === 'trial' ? 1 : 0
      ]);

      const lessonId = lessonResult.insertId;

      // Create transaction
      await connection.execute(`
        INSERT INTO transactions (
          userId, type, amount, status, method, lessonId, createdAt, updatedAt
        ) VALUES (?, 'lesson_payment', ?, 'completed', ?, ?, NOW(), NOW())
      `, [
        studentUserId, session.price,
        session.price === 0 ? 'free' : 'bank_transfer',
        lessonId
      ]);

      // Generate tokens
      const accessToken = crypto.randomBytes(16).toString('hex');
      const tutorToken = crypto.randomBytes(16).toString('hex');
      const studentToken = crypto.randomBytes(16).toString('hex');
      const roomName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create video call session
      await connection.execute(`
        INSERT INTO video_call_sessions (
          roomName, sessionType, lessonId, tutorId, studentId,
          accessToken, tutorToken, studentToken,
          scheduledStartTime, scheduledEndTime,
          status, paymentStatus, canTutorJoin, canStudentJoin,
          provider, expiresAt, createdAt, updatedAt
        ) VALUES (?, 'lesson', ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 'paid', 1, 1, 'videolify', ?, NOW(), NOW())
      `, [
        roomName, lessonId, tutorUserId, studentUserId,
        accessToken, tutorToken, studentToken,
        startTime, endTime,
        new Date(now.getTime() + 4 * 60 * 60000) // Expires in 4 hours
      ]);

      const minutesToStart = Math.round((startTime - now) / 60000);
      const status = minutesToStart < 0 ? '✅ JOIN NGAY' : 
                     minutesToStart <= 15 ? '🟡 SẮP TỚI' : '⏰ CHƯA TỚI GIỜ';

      results.push({
        subject: session.subject,
        status,
        minutesToStart,
        startTime: startTimeStr,
        endTime: endTimeStr,
        accessToken,
        prejoinUrl: `/prejoin-videolify-v2?accessToken=${accessToken}`
      });

      console.log(`✅ Created: ${session.name}\n`);
    }

    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SESSIONS CREATED');
    console.log('='.repeat(80));
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.subject}`);
      console.log(`   Status: ${result.status} (${result.minutesToStart > 0 ? `in ${result.minutesToStart} min` : `started ${Math.abs(result.minutesToStart)} min ago`})`);
      console.log(`   Time: ${result.startTime} - ${result.endTime}`);
      console.log(`   Access Token: ${result.accessToken}`);
      console.log(`   Prejoin URL: http://localhost:3000${result.prejoinUrl}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎯 HƯỚNG DẪN TEST');
    console.log('='.repeat(80));
    console.log(`
1. Đăng nhập tài khoản GIA SƯ:
   → Vào /tutor/dashboard
   → Xem card "Lịch học trực tuyến"
   → Click "Tham gia" → Prejoin page
   → Cài đặt camera/mic/nền ảo
   → Click "Tham gia ngay"

2. Mở trình duyệt khác, đăng nhập HỌC VIÊN:
   → Vào /student/dashboard
   → Làm tương tự như trên

3. Test các tính năng:
   ✓ Prejoin: Camera/mic toggle, virtual background
   ✓ Video call: Chat, whiteboard, screen share, file transfer
    `);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

// Run
createTestSessions().catch(console.error);
