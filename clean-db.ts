import * as dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found');
  process.exit(1);
}

import { db } from './src/lib/db';
import { users, tutors, lessons, tutorAvailability, subjects, gradeLevels, tutorSubjects, timeSlots } from './src/lib/schema';
import { sql } from 'drizzle-orm';

async function cleanDatabase() {
  console.log('🧹 Cleaning database...\n');

  try {
    // Disable foreign key checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

    // Delete in correct order (child tables first)
    console.log('  Deleting lessons...');
    await db.delete(lessons);

    console.log('  Deleting tutor_availability...');
    await db.delete(tutorAvailability);

    console.log('  Deleting time_slots...');
    await db.delete(timeSlots);

    console.log('  Deleting tutor_subjects...');
    await db.delete(tutorSubjects);

    console.log('  Deleting tutors...');
    await db.delete(tutors);

    console.log('  Deleting users...');
    await db.delete(users);

    console.log('  Deleting subjects...');
    await db.delete(subjects);

    console.log('  Deleting grade_levels...');
    await db.delete(gradeLevels);

    // Re-enable foreign key checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

    console.log('\n✅ Database cleaned successfully!');
  } catch (error) {
    console.error('\n❌ Error cleaning database:', error);
    throw error;
  }
}

cleanDatabase()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
