-- COMPLETE PARTIAL MIGRATION
-- Database đã có: users.full_name, users.phone, bookings table
-- Cần làm: drop tutors/students columns, add triggers, add constraints

SELECT 'Starting migration completion...' AS status;

-- STEP 1: Check current state
SELECT COUNT(*) as users_with_fullname FROM users WHERE full_name IS NOT NULL;
SELECT COUNT(*) as tutors_with_fullname FROM tutors WHERE full_name IS NOT NULL;

-- STEP 2: Migrate any remaining data
UPDATE users u
INNER JOIN tutors t ON u.id = t.user_id
SET u.full_name = COALESCE(u.full_name, t.full_name),
    u.phone = COALESCE(u.phone, t.phone)
WHERE t.full_name IS NOT NULL;

UPDATE users u
INNER JOIN students s ON u.id = s.user_id  
SET u.full_name = COALESCE(u.full_name, s.full_name),
    u.phone = COALESCE(u.phone, s.phone)
WHERE s.full_name IS NOT NULL;

SELECT 'Data migrated' AS status;

-- STEP 3: Drop redundant columns
ALTER TABLE tutors DROP COLUMN IF EXISTS full_name;
ALTER TABLE tutors DROP COLUMN IF EXISTS phone;
ALTER TABLE students DROP COLUMN IF EXISTS full_name;
ALTER TABLE students DROP COLUMN IF EXISTS phone;

SELECT 'Redundant columns dropped' AS status;

-- STEP 4: Add unique constraint for trials (check first)
SELECT student_id, tutor_id, COUNT(*) as count
FROM bookings 
WHERE is_trial = 1
GROUP BY student_id, tutor_id
HAVING COUNT(*) > 1;

-- Delete duplicate trials
DELETE b1 FROM bookings b1
INNER JOIN bookings b2 
WHERE b1.student_id = b2.student_id
  AND b1.tutor_id = b2.tutor_id
  AND b1.is_trial = 1
  AND b2.is_trial = 1
  AND b1.id > b2.id;

-- Add unique index if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_trial_per_tutor 
ON bookings(student_id, tutor_id, is_trial);

SELECT 'Trial constraints added' AS status;

-- STEP 5: Create triggers
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

SELECT 'Triggers created' AS status;

-- STEP 6: Add indexes
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

SELECT 'Indexes created' AS status;

-- Final verification
SELECT '✅ MIGRATION COMPLETE!' AS final_status;

SELECT COUNT(*) as users_with_fullname FROM users WHERE full_name IS NOT NULL;
SELECT COUNT(*) as total_bookings FROM bookings;
SHOW TRIGGERS;
