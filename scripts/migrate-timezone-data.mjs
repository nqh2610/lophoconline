/**
 * Migration Script: Fix Timezone Data
 *
 * This script fixes old data that was stored with incorrect timezone assumptions.
 * It converts times from "assumed UTC" to "actual UTC" by subtracting 7 hours.
 *
 * SCENARIO:
 * - Old code: User enters 15:35 VN → stored as 15:35 UTC (WRONG)
 * - Displayed as: 15:35 UTC + 7 = 22:35 VN (BUG!)
 * - Should be: 15:35 VN → 08:35 UTC → displays as 15:35 VN
 *
 * MIGRATION:
 * - Find records with times that look like VN time (not UTC)
 * - Subtract 7 hours to convert to actual UTC
 */

import mysql from 'mysql2/promise';
import readline from 'readline';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lophoc_online',
  port: 3306
});

console.log('✅ Connected to database\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateTimezoneData() {
  try {
    console.log('🔍 Timezone Data Migration Tool\n');
    console.log('This will fix video_call_sessions times that were stored incorrectly.\n');

    // STEP 1: Analyze data
    console.log('📊 Analyzing current data...\n');

    const [sessions] = await connection.execute(`
      SELECT
        vcs.id,
        vcs.lesson_id,
        vcs.scheduled_start_time,
        vcs.scheduled_end_time,
        vcs.created_at,
        tb.start_time as lesson_start_time,
        tb.end_time as lesson_end_time
      FROM video_call_sessions vcs
      LEFT JOIN trial_bookings tb ON tb.id = vcs.lesson_id
      WHERE vcs.lesson_id IS NOT NULL
      ORDER BY vcs.created_at DESC
    `);

    if (sessions.length === 0) {
      console.log('ℹ️  No sessions found to migrate.');
      return;
    }

    console.log(`Found ${sessions.length} video call sessions\n`);

    // Analyze which ones need fixing
    const needsFix = [];
    const alreadyOk = [];

    for (const session of sessions) {
      if (!session.lesson_start_time) {
        // No trial_booking data, skip
        continue;
      }

      // Extract hour from scheduled_start_time (UTC)
      const startTime = new Date(session.scheduled_start_time);
      const utcHour = startTime.getUTCHours();
      const utcMinute = startTime.getUTCMinutes();

      // Extract hour from lesson start_time (expected VN time)
      const [lessonHour, lessonMinute] = session.lesson_start_time.split(':').map(Number);

      // If UTC hour matches VN hour, it was stored incorrectly
      // (Should be UTC hour = VN hour - 7)
      const expectedUtcHour = (lessonHour - 7 + 24) % 24;

      if (utcHour === lessonHour && utcMinute === lessonMinute) {
        // WRONG: stored as VN time in UTC field
        needsFix.push({
          ...session,
          currentUtc: `${utcHour.toString().padStart(2, '0')}:${utcMinute.toString().padStart(2, '0')}`,
          expectedVn: session.lesson_start_time,
          correctUtc: `${expectedUtcHour.toString().padStart(2, '0')}:${lessonMinute.toString().padStart(2, '0')}`,
        });
      } else if (utcHour === expectedUtcHour) {
        // CORRECT: already in UTC
        alreadyOk.push(session.id);
      } else {
        // UNKNOWN: time doesn't match expectations
        console.log(`⚠️  Session ${session.id}: Unexpected time mismatch`);
      }
    }

    console.log(`✅ Already correct: ${alreadyOk.length} sessions`);
    console.log(`🔧 Needs fixing: ${needsFix.length} sessions\n`);

    if (needsFix.length === 0) {
      console.log('✅ All data is already correct! No migration needed.');
      return;
    }

    // STEP 2: Show examples
    console.log('📋 Examples of data that will be fixed:\n');
    needsFix.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. Session ${item.id} (Lesson ${item.lesson_id}):`);
      console.log(`   Current (WRONG):  ${item.currentUtc} UTC → displays as ${item.currentUtc} VN`);
      console.log(`   Expected VN time: ${item.expectedVn}`);
      console.log(`   Will change to:   ${item.correctUtc} UTC → displays as ${item.expectedVn} VN ✅\n`);
    });

    if (needsFix.length > 5) {
      console.log(`... and ${needsFix.length - 5} more sessions\n`);
    }

    // STEP 3: Confirm
    const answer = await question(`❓ Do you want to proceed with migration? (yes/no): `);

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Migration cancelled.');
      return;
    }

    // STEP 4: Backup
    console.log('\n💾 Creating backup...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS video_call_sessions_backup_timezone AS
      SELECT * FROM video_call_sessions WHERE lesson_id IS NOT NULL
    `);

    console.log('✅ Backup created: video_call_sessions_backup_timezone\n');

    // STEP 5: Migrate
    console.log('🔄 Migrating data...\n');

    let migratedCount = 0;

    for (const item of needsFix) {
      try {
        // Subtract 7 hours from both start and end times
        await connection.execute(`
          UPDATE video_call_sessions
          SET
            scheduled_start_time = DATE_SUB(scheduled_start_time, INTERVAL 7 HOUR),
            scheduled_end_time = DATE_SUB(scheduled_end_time, INTERVAL 7 HOUR),
            expires_at = DATE_SUB(expires_at, INTERVAL 7 HOUR),
            updated_at = NOW()
          WHERE id = ?
        `, [item.id]);

        migratedCount++;
        process.stdout.write(`\rMigrated: ${migratedCount}/${needsFix.length}`);
      } catch (error) {
        console.error(`\n❌ Error migrating session ${item.id}:`, error.message);
      }
    }

    console.log('\n\n✅ Migration completed!');
    console.log(`   - Migrated: ${migratedCount} sessions`);
    console.log(`   - Backup table: video_call_sessions_backup_timezone\n`);

    // STEP 6: Verify
    console.log('🔍 Verifying migration...\n');

    const [sampleAfter] = await connection.execute(`
      SELECT
        vcs.id,
        vcs.scheduled_start_time,
        tb.start_time as expected_vn_time
      FROM video_call_sessions vcs
      JOIN trial_bookings tb ON tb.id = vcs.lesson_id
      WHERE vcs.id = ?
    `, [needsFix[0].id]);

    if (sampleAfter.length > 0) {
      const sample = sampleAfter[0];
      const utcTime = new Date(sample.scheduled_start_time);
      const [expectedHour, expectedMin] = sample.expected_vn_time.split(':').map(Number);
      const expectedUtcHour = (expectedHour - 7 + 24) % 24;

      console.log('Sample verification:');
      console.log(`  Session ${sample.id}:`);
      console.log(`  Expected VN time: ${sample.expected_vn_time}`);
      console.log(`  Stored UTC: ${utcTime.getUTCHours()}:${utcTime.getUTCMinutes().toString().padStart(2, '0')}`);
      console.log(`  Expected UTC: ${expectedUtcHour}:${expectedMin.toString().padStart(2, '0')}`);

      if (utcTime.getUTCHours() === expectedUtcHour) {
        console.log('  ✅ PASS: Time is now correct!\n');
      } else {
        console.log('  ❌ FAIL: Time is still incorrect!\n');
      }
    }

    console.log('📝 Next steps:');
    console.log('1. Test the app to verify times display correctly');
    console.log('2. If everything works, you can drop the backup table:');
    console.log('   DROP TABLE video_call_sessions_backup_timezone;\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    rl.close();
    await connection.end();
  }
}

migrateTimezoneData();
