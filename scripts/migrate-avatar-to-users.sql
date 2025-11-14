-- Migration: Consolidate avatar to users table only
-- Date: 2025-10-29

START TRANSACTION;

-- Step 1: Migrate tutor avatars to users
UPDATE users u
INNER JOIN tutors t ON u.id = t.user_id
SET u.avatar = COALESCE(u.avatar, t.avatar)
WHERE t.avatar IS NOT NULL;

SELECT ROW_COUNT() AS tutor_avatars_migrated;

-- Step 2: Migrate student avatars to users
UPDATE users u
INNER JOIN students s ON u.id = s.user_id
SET u.avatar = COALESCE(u.avatar, s.avatar)
WHERE s.avatar IS NOT NULL;

SELECT ROW_COUNT() AS student_avatars_migrated;

-- Step 3: Drop avatar columns from tutors and students
ALTER TABLE tutors DROP COLUMN avatar;
ALTER TABLE students DROP COLUMN avatar;

SELECT 'Avatar migration completed!' AS status;

COMMIT;
