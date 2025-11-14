-- SIMPLIFIED MIGRATION FOR MARIADB
-- Run this step-by-step

-- STEP 1: Add full_name to users table
ALTER TABLE users ADD COLUMN full_name VARCHAR(255) AFTER email;
ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER full_name;

SELECT 'Step 1: Added full_name and phone to users table' AS status;

-- STEP 2: Migrate data from tutors to users
UPDATE users u
INNER JOIN tutors t ON u.id = t.user_id
SET u.full_name = t.full_name, 
    u.phone = COALESCE(u.phone, t.phone)
WHERE t.full_name IS NOT NULL;

SELECT 'Step 2: Migrated tutor data to users' AS status;

-- STEP 3: Migrate data from students to users  
UPDATE users u
INNER JOIN students s ON u.id = s.user_id
SET u.full_name = COALESCE(u.full_name, s.full_name),
    u.phone = COALESCE(u.phone, s.phone)
WHERE s.full_name IS NOT NULL;

SELECT 'Step 3: Migrated student data to users' AS status;

-- STEP 4: Drop redundant columns
ALTER TABLE tutors DROP COLUMN full_name;
ALTER TABLE tutors DROP COLUMN phone;
ALTER TABLE students DROP COLUMN full_name;
ALTER TABLE students DROP COLUMN phone;

SELECT 'Step 4: Dropped redundant columns from tutors and students' AS status;

-- STEP 5: Rename lessons table to bookings
RENAME TABLE lessons TO bookings;

SELECT 'Step 5: Renamed lessons to bookings' AS status;

-- STEP 6: Add unique constraint for trial bookings
-- First check for existing duplicates
SELECT student_id, tutor_id, COUNT(*) as count
FROM bookings 
WHERE is_trial = 1
GROUP BY student_id, tutor_id
HAVING COUNT(*) > 1;

-- Delete duplicates if any (keep oldest)
DELETE b1 FROM bookings b1
INNER JOIN bookings b2 
WHERE b1.student_id = b2.student_id
  AND b1.tutor_id = b2.tutor_id
  AND b1.is_trial = 1 
  AND b2.is_trial = 1
  AND b1.id > b2.id;

-- Add unique index
CREATE UNIQUE INDEX idx_unique_trial_per_tutor 
ON bookings(student_id, tutor_id, is_trial);

SELECT 'Step 6: Added unique constraint for trial bookings' AS status;

-- STEP 7: Create triggers for self-booking prevention
DELIMITER $$

DROP TRIGGER IF EXISTS prevent_self_booking_before_insert$$
CREATE TRIGGER prevent_self_booking_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  DECLARE tutor_user_id INT;
  SELECT user_id INTO tutor_user_id FROM tutors WHERE id = NEW.tutor_id;
  IF NEW.student_id = tutor_user_id THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Student cannot book themselves as tutor';
  END IF;
END$$

DROP TRIGGER IF EXISTS prevent_self_booking_before_update$$
CREATE TRIGGER prevent_self_booking_before_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
  DECLARE tutor_user_id INT;
  SELECT user_id INTO tutor_user_id FROM tutors WHERE id = NEW.tutor_id;
  IF NEW.student_id = tutor_user_id THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Student cannot book themselves as tutor';
  END IF;
END$$

DELIMITER ;

SELECT 'Step 7: Created self-booking prevention triggers' AS status;

-- STEP 8: Create triggers for JSON sync (tutors.subjects <-> tutor_subjects)
DELIMITER $$

DROP TRIGGER IF EXISTS sync_tutor_subjects_after_insert$$
CREATE TRIGGER sync_tutor_subjects_after_insert
AFTER INSERT ON tutor_subjects
FOR EACH ROW
BEGIN
  UPDATE tutors
  SET subjects = (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', s.name,
        'grades', g.name
      )
    )
    FROM tutor_subjects ts
    INNER JOIN subjects s ON ts.subject_id = s.id
    INNER JOIN grade_levels g ON ts.grade_level_id = g.id
    WHERE ts.tutor_id = NEW.tutor_id
  )
  WHERE id = NEW.tutor_id;
END$$

DROP TRIGGER IF EXISTS sync_tutor_subjects_after_update$$
CREATE TRIGGER sync_tutor_subjects_after_update
AFTER UPDATE ON tutor_subjects
FOR EACH ROW
BEGIN
  UPDATE tutors
  SET subjects = (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', s.name,
        'grades', g.name
      )
    )
    FROM tutor_subjects ts
    INNER JOIN subjects s ON ts.subject_id = s.id
    INNER JOIN grade_levels g ON ts.grade_level_id = g.id
    WHERE ts.tutor_id = NEW.tutor_id
  )
  WHERE id = NEW.tutor_id;
END$$

DROP TRIGGER IF EXISTS sync_tutor_subjects_after_delete$$
CREATE TRIGGER sync_tutor_subjects_after_delete
AFTER DELETE ON tutor_subjects
FOR EACH ROW
BEGIN
  UPDATE tutors
  SET subjects = (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', s.name,
        'grades', g.name
      )
    )
    FROM tutor_subjects ts
    INNER JOIN subjects s ON ts.subject_id = s.id
    INNER JOIN grade_levels g ON ts.grade_level_id = g.id
    WHERE ts.tutor_id = OLD.tutor_id
  )
  WHERE id = OLD.tutor_id;
END$$

DELIMITER ;

SELECT 'Step 8: Created JSON sync triggers' AS status;

-- STEP 9: Add indexes for performance
CREATE INDEX idx_users_full_name ON users(full_name);
CREATE INDEX idx_users_phone ON users(phone);

SELECT 'Step 9: Created performance indexes' AS status;

-- Final verification
SELECT 'Migration completed successfully!' AS final_status;

SELECT 
  COUNT(*) as users_with_fullname 
FROM users 
WHERE full_name IS NOT NULL;

SELECT COUNT(*) as total_bookings FROM bookings;

SHOW TRIGGERS WHERE `Trigger` LIKE '%booking%' OR `Trigger` LIKE '%tutor_subjects%';
