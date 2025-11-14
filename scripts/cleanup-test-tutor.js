const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lophoc_online'
  });
  
  const [tutors] = await conn.query('SELECT id FROM tutors WHERE user_id = 174');
  
  if (tutors.length > 0) {
    const tid = tutors[0].id;
    await conn.query('DELETE FROM tutor_subjects WHERE tutor_id = ?', [tid]);
    await conn.query('DELETE FROM tutor_availability WHERE tutor_id = ?', [tid]);
    await conn.query('DELETE FROM tutors WHERE id = ?', [tid]);
    console.log('✅ Deleted tutor ID:', tid);
  } else {
    console.log('ℹ️  No tutor found for user 174');
  }
  
  await conn.end();
})();
