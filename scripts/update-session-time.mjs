#!/usr/bin/env node
/**
 * Script cập nhật thời gian video call sessions để test ngay
 * Chạy: node scripts/update-session-time.mjs
 */

import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '', // Thay password nếu có
  database: 'lophoc_online'
};

async function updateSessionTime() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected!\n');

    const now = new Date();
    const endTime = new Date(now.getTime() + 5 * 60 * 60000); // 5 giờ sau
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60000); // 6 giờ sau

    // ✅ Convert to UTC string format for MySQL
    const nowUTC = now.toISOString().slice(0, 19).replace('T', ' ');
    const endUTC = endTime.toISOString().slice(0, 19).replace('T', ' ');
    const expiresUTC = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // SESSION ID CỤ THỂ - Thay đổi ID này nếu cần
    const sessionId = 13;

    console.log(`⏰ Updating video_call_session ID=${sessionId}...`);
    console.log(`   Now (Local): ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    console.log(`   Now (UTC): ${now.toISOString()}`);
    console.log(`   Start Time (UTC): ${now.toISOString()}`);
    console.log(`   End Time (UTC):   ${endTime.toISOString()}`);
    console.log(`   Expires At (UTC): ${expiresAt.toISOString()}\n`);

    // ✅ Use UTC strings directly to avoid timezone conversion
    const [result] = await connection.execute(`
      UPDATE video_call_sessions 
      SET 
        scheduled_start_time = ?,
        scheduled_end_time = ?,
        expires_at = ?,
        status = 'scheduled',
        can_tutor_join = 1,
        can_student_join = 1,
        updated_at = UTC_TIMESTAMP()
      WHERE id = ?
    `, [nowUTC, endUTC, expiresUTC, sessionId]);

    if (result.affectedRows === 0) {
      console.log(`⚠️  Session ID=${sessionId} không tồn tại hoặc đã kết thúc!\n`);
      return;
    }

    console.log(`✅ Updated session ID=${sessionId}\n`);

    // Hiển thị thông tin session đã update
    const [sessions] = await connection.execute(`
      SELECT 
        v.id,
        v.room_name as roomName,
        v.access_token as accessToken,
        v.scheduled_start_time as scheduledStartTime,
        v.scheduled_end_time as scheduledEndTime,
        v.status
      FROM video_call_sessions v
      WHERE v.id = ?
    `, [sessionId]);

    if (sessions.length === 0) {
      console.log(`⚠️  Session ID=${sessionId} không tìm thấy!`);
      return;
    }

    const session = sessions[0];
    
    console.log('='.repeat(80));
    console.log('📊 SESSION UPDATED (Ready to join now!)');
    console.log('='.repeat(80));
    console.log(`\nSession ID: ${session.id}`);
    console.log(`Room: ${session.roomName}`);
    
    // ✅ Display times in both UTC and local timezone
    const startDisplay = new Date(session.scheduledStartTime);
    const endDisplay = new Date(session.scheduledEndTime);
    
    console.log(`\n⏰ TIME (UTC):`);
    console.log(`   Start: ${startDisplay.toISOString()}`);
    console.log(`   End:   ${endDisplay.toISOString()}`);
    
    console.log(`\n⏰ TIME (Vietnam - UTC+7):`);
    console.log(`   Start: ${startDisplay.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    console.log(`   End:   ${endDisplay.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    
    console.log(`\nStatus: ✅ CAN JOIN NOW`);
    console.log(`\nAccess Token: ${session.accessToken}`);
    console.log(`\n🔗 PREJOIN URL:`);
    console.log(`http://localhost:3000/prejoin-videolify-v2?accessToken=${session.accessToken}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 HƯỚNG DẪN TEST:');
    console.log('='.repeat(80));
    console.log(`
1. Copy link prejoin ở trên
2. Paste vào trình duyệt
3. Cài đặt camera/mic/nền ảo
4. Click "Tham gia ngay" → Vào video call

HOẶC:

1. Vào /tutor/dashboard hoặc /student/dashboard
2. Tìm session ID=${sessionId} trong card "Lịch học trực tuyến"
3. Click "Tham gia"
    `);
    
    // Tự động copy link vào clipboard (nếu có xclip trên Linux)
    console.log('\n💡 TIP: Đã hiển thị link prejoin ở trên, copy và mở trong trình duyệt!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database không tồn tại. Hãy tạo database trước:');
      console.log('   CREATE DATABASE lophoc_online;');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Không kết nối được MySQL. Hãy kiểm tra:');
      console.log('   - MySQL đã chạy chưa?');
      console.log('   - Port 3306 có đúng không?');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Lỗi đăng nhập MySQL. Hãy kiểm tra:');
      console.log('   - Username/password trong file có đúng không?');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run
updateSessionTime().catch(console.error);
