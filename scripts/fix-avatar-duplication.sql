-- Fix Avatar Duplication (3NF Violation)

-- Step 1: Migrate avatar data to users table
UPDATE users u
INNER JOIN tutors t ON u.id = t.user_id
SET u.avatar = COALESCE(u.avatar, t.avatar)
WHERE t.avatar IS NOT NULL;

UPDATE users u
INNER JOIN students s ON u.id = s.user_id
SET u.avatar = COALESCE(u.avatar, s.avatar)
WHERE s.avatar IS NOT NULL;

SELECT 'Avatar data migrated to users' AS status;

-- Step 2: Drop redundant avatar columns
ALTER TABLE tutors DROP COLUMN avatar;
ALTER TABLE students DROP COLUMN avatar;

SELECT 'Avatar columns dropped from tutors and students' AS status;

-- Verification
SELECT COUNT(*) as users_with_avatar FROM users WHERE avatar IS NOT NULL;
