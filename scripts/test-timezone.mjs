import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lophoc_online',
  timezone: '+00:00'
});

console.log('🔍 Testing MySQL Timezone Handling\n');

// Get session data
const [rows] = await connection.execute(
  'SELECT id, scheduled_start_time, scheduled_end_time FROM video_call_sessions WHERE id = 13'
);

const session = rows[0];

console.log('📊 Raw MySQL Data:');
console.log('   scheduled_start_time:', session.scheduled_start_time);
console.log('   scheduled_end_time:', session.scheduled_end_time);

console.log('\n📅 JavaScript Date Objects:');
const startDate = new Date(session.scheduled_start_time);
const endDate = new Date(session.scheduled_end_time);
console.log('   Start Date:', startDate);
console.log('   End Date:', endDate);

console.log('\n⏰ ISO Strings (UTC):');
console.log('   Start:', startDate.toISOString());
console.log('   End:', endDate.toISOString());

console.log('\n🕐 Current Time:');
const now = new Date();
console.log('   Now (ISO):', now.toISOString());
console.log('   Now (Local VN):', now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));

console.log('\n✅ Can Join Check:');
const joinWindowStart = new Date(startDate.getTime() - 15 * 60000);
const graceWindowEnd = new Date(endDate.getTime() + 60 * 60000);
console.log('   Join Window Start:', joinWindowStart.toISOString());
console.log('   Grace Window End:', graceWindowEnd.toISOString());
console.log('   Can Join Now?', now >= joinWindowStart && now <= graceWindowEnd);

await connection.end();
