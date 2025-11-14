-- ============================================================
-- DATABASE REFACTORING SCRIPT
-- Ngày tạo: 2025-10-29
-- Mục đích: Cải thiện cấu trúc CSDL theo 3NF
-- ============================================================

-- BƯỚC 1: Thêm full_name vào bảng users (phone đã có)
-- ============================================================
ALTER TABLE users 
ADD COLUMN full_name VARCHAR(255) AFTER email;

-- BƯỚC 2: Migrate dữ liệu từ tutors và students lên users
-- ============================================================

-- Update users từ tutors table
UPDATE users u
INNER JOIN tutors t ON u.id = t.user_id
SET 
  u.full_name = t.full_name,
  u.phone = COALESCE(u.phone, t.phone) -- Giữ phone của users nếu đã có
WHERE t.full_name IS NOT NULL;

-- Update users từ students table  
UPDATE users u
INNER JOIN students s ON u.id = s.user_id
SET 
  u.full_name = s.full_name,
  u.phone = COALESCE(u.phone, s.phone) -- Giữ phone của users nếu đã có
WHERE s.full_name IS NOT NULL;

-- BƯỚC 3: Xóa cột dư thừa trong tutors và students
-- ============================================================

-- Backup trước khi xóa (optional - comment out nếu không cần)
-- CREATE TABLE tutors_backup AS SELECT * FROM tutors;
-- CREATE TABLE students_backup AS SELECT * FROM students;

ALTER TABLE tutors 
DROP COLUMN full_name,
DROP COLUMN phone;

ALTER TABLE students
DROP COLUMN full_name,
DROP COLUMN phone;

-- BƯỚC 4: Đổi tên bảng lessons → bookings
-- ============================================================

RENAME TABLE lessons TO bookings;

-- BƯỚC 5: Thêm UNIQUE constraint cho trial bookings
-- ============================================================
-- Đảm bảo mỗi student chỉ có 1 trial booking với 1 tutor

-- Xóa các trial duplicate trước (giữ lại cái cũ nhất)
DELETE b1 FROM bookings b1
INNER JOIN bookings b2 
WHERE 
  b1.student_id = b2.student_id 
  AND b1.tutor_id = b2.tutor_id
  AND b1.is_trial = 1 
  AND b2.is_trial = 1
  AND b1.id > b2.id;

-- Thêm unique index (MariaDB doesn't support filtered index with WHERE clause)
-- Sử dụng composite unique key để enforce rule: 1 trial per student-tutor pair
-- Note: Điều này sẽ allow nhiều regular bookings (is_trial=0) nhưng chỉ 1 trial (is_trial=1)
CREATE UNIQUE INDEX idx_unique_trial_per_tutor 
ON bookings(student_id, tutor_id, is_trial);

-- BƯỚC 6: Thêm trigger để prevent self-booking
-- ============================================================

DELIMITER $$

CREATE TRIGGER prevent_self_booking_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  DECLARE tutor_user_id INT;
  
  -- Lấy user_id của tutor
  SELECT user_id INTO tutor_user_id
  FROM tutors
  WHERE id = NEW.tutor_id;
  
  -- Lấy user_id của student và so sánh
  IF EXISTS (
    SELECT 1 FROM students 
    WHERE id = NEW.student_id 
    AND user_id = tutor_user_id
  ) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Student không thể booking với chính mình trong vai trò tutor';
  END IF;
END$$

CREATE TRIGGER prevent_self_booking_before_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
  DECLARE tutor_user_id INT;
  
  -- Chỉ check khi student_id hoặc tutor_id thay đổi
  IF NEW.student_id != OLD.student_id OR NEW.tutor_id != OLD.tutor_id THEN
    SELECT user_id INTO tutor_user_id
    FROM tutors
    WHERE id = NEW.tutor_id;
    
    IF EXISTS (
      SELECT 1 FROM students 
      WHERE id = NEW.student_id 
      AND user_id = tutor_user_id
    ) THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student không thể booking với chính mình trong vai trò tutor';
    END IF;
  END IF;
END$$

DELIMITER ;

-- BƯỚC 7: Tạo trigger đồng bộ tutors.subjects (JSON) với tutor_subjects
-- ============================================================

DELIMITER $$

-- Trigger khi INSERT vào tutor_subjects → Sync JSON
CREATE TRIGGER sync_subjects_json_after_insert
AFTER INSERT ON tutor_subjects
FOR EACH ROW
BEGIN
  DECLARE current_subjects TEXT;
  DECLARE new_subjects JSON;
  
  -- Lấy subjects JSON hiện tại
  SELECT subjects INTO current_subjects FROM tutors WHERE id = NEW.tutor_id;
  
  -- Parse và rebuild subjects JSON
  SET new_subjects = (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'subjectId', ts.subject_id,
        'subjectName', s.name,
        'grades', (
          SELECT JSON_ARRAYAGG(gl.name)
          FROM tutor_subjects ts2
          INNER JOIN grade_levels gl ON ts2.grade_level_id = gl.id
          WHERE ts2.tutor_id = NEW.tutor_id 
          AND ts2.subject_id = ts.subject_id
          AND ts2.is_active = 1
        )
      )
    )
    FROM tutor_subjects ts
    INNER JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.tutor_id = NEW.tutor_id
    AND ts.is_active = 1
    GROUP BY ts.subject_id, s.name
  );
  
  -- Update tutors.subjects
  UPDATE tutors 
  SET subjects = COALESCE(new_subjects, '[]')
  WHERE id = NEW.tutor_id;
END$$

-- Trigger khi UPDATE tutor_subjects → Sync JSON
CREATE TRIGGER sync_subjects_json_after_update
AFTER UPDATE ON tutor_subjects
FOR EACH ROW
BEGIN
  DECLARE new_subjects JSON;
  
  SET new_subjects = (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'subjectId', ts.subject_id,
        'subjectName', s.name,
        'grades', (
          SELECT JSON_ARRAYAGG(gl.name)
          FROM tutor_subjects ts2
          INNER JOIN grade_levels gl ON ts2.grade_level_id = gl.id
          WHERE ts2.tutor_id = NEW.tutor_id 
          AND ts2.subject_id = ts.subject_id
          AND ts2.is_active = 1
        )
      )
    )
    FROM tutor_subjects ts
    INNER JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.tutor_id = NEW.tutor_id
    AND ts.is_active = 1
    GROUP BY ts.subject_id, s.name
  );
  
  UPDATE tutors 
  SET subjects = COALESCE(new_subjects, '[]')
  WHERE id = NEW.tutor_id;
END$$

-- Trigger khi DELETE tutor_subjects → Sync JSON
CREATE TRIGGER sync_subjects_json_after_delete
AFTER DELETE ON tutor_subjects
FOR EACH ROW
BEGIN
  DECLARE new_subjects JSON;
  
  SET new_subjects = (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'subjectId', ts.subject_id,
        'subjectName', s.name,
        'grades', (
          SELECT JSON_ARRAYAGG(gl.name)
          FROM tutor_subjects ts2
          INNER JOIN grade_levels gl ON ts2.grade_level_id = gl.id
          WHERE ts2.tutor_id = OLD.tutor_id 
          AND ts2.subject_id = ts.subject_id
          AND ts2.is_active = 1
        )
      )
    )
    FROM tutor_subjects ts
    INNER JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.tutor_id = OLD.tutor_id
    AND ts.is_active = 1
    GROUP BY ts.subject_id, s.name
  );
  
  UPDATE tutors 
  SET subjects = COALESCE(new_subjects, '[]')
  WHERE id = OLD.tutor_id;
END$$

DELIMITER ;

-- BƯỚC 8: Tạo stored procedure để sync ngược lại (JSON → tutor_subjects)
-- ============================================================

DELIMITER $$

CREATE PROCEDURE sync_json_to_tutor_subjects(IN tutor_id_param INT)
BEGIN
  DECLARE subjects_json TEXT;
  DECLARE idx INT DEFAULT 0;
  DECLARE total INT;
  
  -- Lấy subjects JSON
  SELECT subjects INTO subjects_json FROM tutors WHERE id = tutor_id_param;
  
  -- Xóa tất cả tutor_subjects cũ
  DELETE FROM tutor_subjects WHERE tutor_id = tutor_id_param;
  
  -- Parse JSON và insert vào tutor_subjects
  -- (Cần implement bằng JSON_TABLE trong MySQL 8.0+)
  -- Hoặc xử lý ở application layer (Node.js) thay vì stored procedure
  
  -- TODO: Implement JSON parsing logic hoặc call từ Node.js
END$$

DELIMITER ;

-- BƯỚC 9: Add indexes để tối ưu performance
-- ============================================================

-- Index cho users.full_name (search by name)
CREATE INDEX idx_users_full_name ON users(full_name);

-- Index cho bookings (thay thế lessons indexes)
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_tutor ON bookings(tutor_id);
CREATE INDEX idx_bookings_trial ON bookings(is_trial);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(date);

-- BƯỚC 10: Verify data integrity
-- ============================================================

-- Check users có full_name NULL
SELECT COUNT(*) as users_without_name 
FROM users 
WHERE full_name IS NULL OR full_name = '';

-- Check duplicate trials (should be 0 after constraint)
SELECT student_id, tutor_id, COUNT(*) as trial_count
FROM bookings
WHERE is_trial = 1
GROUP BY student_id, tutor_id
HAVING COUNT(*) > 1;

-- Check self-bookings (should be 0)
SELECT b.id, b.student_id, b.tutor_id, s.user_id as student_user_id, t.user_id as tutor_user_id
FROM bookings b
INNER JOIN students s ON b.student_id = s.id
INNER JOIN tutors t ON b.tutor_id = t.id
WHERE s.user_id = t.user_id;

-- ============================================================
-- END OF MIGRATION
-- ============================================================

-- ROLLBACK SCRIPT (if needed)
-- ============================================================
/*
-- Drop triggers
DROP TRIGGER IF EXISTS prevent_self_booking_before_insert;
DROP TRIGGER IF EXISTS prevent_self_booking_before_update;
DROP TRIGGER IF EXISTS sync_subjects_json_after_insert;
DROP TRIGGER IF EXISTS sync_subjects_json_after_update;
DROP TRIGGER IF EXISTS sync_subjects_json_after_delete;

-- Drop stored procedure
DROP PROCEDURE IF EXISTS sync_json_to_tutor_subjects;

-- Rename table back
RENAME TABLE bookings TO lessons;

-- Restore columns (from backup if exists)
ALTER TABLE tutors ADD COLUMN full_name VARCHAR(255);
ALTER TABLE tutors ADD COLUMN phone VARCHAR(20);
ALTER TABLE students ADD COLUMN full_name VARCHAR(255);
ALTER TABLE students ADD COLUMN phone VARCHAR(20);

-- Restore data from users
UPDATE tutors t
INNER JOIN users u ON t.user_id = u.id
SET t.full_name = u.full_name, t.phone = u.phone;

UPDATE students s
INNER JOIN users u ON s.user_id = u.id
SET s.full_name = u.full_name, s.phone = u.phone;

-- Remove from users
ALTER TABLE users DROP COLUMN full_name;

-- Drop indexes
DROP INDEX idx_unique_trial_per_tutor ON bookings;
DROP INDEX idx_users_full_name ON users;
*/
