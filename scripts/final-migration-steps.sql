-- FINAL MIGRATION STEPS: Add Triggers and Constraints Only
-- Database state: users.full_name exists, tutors/students cleaned, bookings exists

SELECT 'Adding triggers and constraints...' AS status;

-- STEP 1: Clean duplicate trials if any
DELETE b1 FROM bookings b1
INNER JOIN bookings b2 
WHERE b1.student_id = b2.student_id
  AND b1.tutor_id = b2.tutor_id
  AND b1.is_trial = 1
  AND b2.is_trial = 1
  AND b1.id > b2.id;

SELECT ROW_COUNT() AS duplicate_trials_removed;

-- STEP 2: Add unique constraint for trials
-- Check if index already exists
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = 'lophoc_online' 
    AND table_name = 'bookings' 
    AND index_name = 'idx_unique_trial_per_tutor'
);

SET @sql = IF(
  @index_exists = 0,
  'CREATE UNIQUE INDEX idx_unique_trial_per_tutor ON bookings(student_id, tutor_id, is_trial)',
  'SELECT "Index already exists" AS skip_message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Trial constraint checked/added' AS status;

-- STEP 3: Create self-booking prevention triggers
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

SELECT 'Self-booking prevention triggers created' AS status;

-- STEP 4: Create JSON sync triggers
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

SELECT 'JSON sync triggers created' AS status;

-- STEP 5: Add performance indexes
SET @index_fullname = (
  SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = 'lophoc_online' AND table_name = 'users' AND index_name = 'idx_users_full_name'
);
SET @sql_fullname = IF(@index_fullname = 0, 
  'CREATE INDEX idx_users_full_name ON users(full_name)', 
  'SELECT "Index exists" AS skip'
);
PREPARE stmt FROM @sql_fullname;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_phone = (
  SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = 'lophoc_online' AND table_name = 'users' AND index_name = 'idx_users_phone'
);
SET @sql_phone = IF(@index_phone = 0, 
  'CREATE INDEX idx_users_phone ON users(phone)', 
  'SELECT "Index exists" AS skip'
);
PREPARE stmt FROM @sql_phone;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Performance indexes checked/added' AS status;

-- FINAL VERIFICATION
SELECT '✅ MIGRATION COMPLETE!' AS final_status;

SELECT COUNT(*) as users_with_fullname FROM users WHERE full_name IS NOT NULL;
SELECT COUNT(*) as total_bookings FROM bookings;
SELECT COUNT(*) as total_triggers FROM information_schema.triggers WHERE trigger_schema = 'lophoc_online';

SHOW TRIGGERS WHERE `Table` IN ('bookings', 'tutor_subjects');
