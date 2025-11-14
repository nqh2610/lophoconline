-- ========================================
-- MIGRATION: Fix Time Management System
-- ========================================

USE lophoc_online;

-- ========================================
-- 1. FIX tutor_availability - Add shift_type
-- ========================================

ALTER TABLE tutor_availability 
ADD COLUMN shift_type VARCHAR(20) AFTER day_of_week;

-- Update existing data with shift_type based on time
UPDATE tutor_availability
SET shift_type = CASE 
  WHEN TIME(start_time) >= '06:00' AND TIME(start_time) < '12:00' THEN 'morning'
  WHEN TIME(start_time) >= '12:00' AND TIME(start_time) < '18:00' THEN 'afternoon'
  WHEN TIME(start_time) >= '18:00' THEN 'evening'
  ELSE 'morning'
END;

-- Make shift_type NOT NULL after updating
ALTER TABLE tutor_availability 
MODIFY COLUMN shift_type VARCHAR(20) NOT NULL;

-- ========================================
-- 2. CREATE teaching_sessions (CA DẠY)
-- ========================================

CREATE TABLE IF NOT EXISTS teaching_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tutor_id BIGINT UNSIGNED NOT NULL,
  availability_id BIGINT UNSIGNED,  -- FK → tutor_availability.id (optional)
  subject_id BIGINT UNSIGNED NOT NULL,
  grade_level_id BIGINT UNSIGNED NOT NULL,
  
  -- Time details
  day_of_week TINYINT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(3,1) NOT NULL COMMENT 'Calculated: (end_time - start_time) in hours',
  
  -- Pricing
  price_per_session INT NOT NULL COMMENT 'Total price = duration × hourly_rate',
  
  -- Capacity
  max_students TINYINT DEFAULT 1 COMMENT '1 = one-on-one, >1 = group class',
  current_students TINYINT DEFAULT 0 COMMENT 'Number of enrolled students',
  
  -- Status
  status VARCHAR(20) DEFAULT 'open' COMMENT 'open, full, paused, cancelled',
  
  -- Metadata
  title VARCHAR(255) COMMENT 'Session title: "Toán 10 - Ôn thi HK1"',
  description TEXT,
  
  -- Validity period
  start_date DATE NOT NULL COMMENT 'Start offering from this date',
  end_date DATE COMMENT 'Stop offering after this date (NULL = indefinite)',
  
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_tutor_status (tutor_id, status),
  INDEX idx_subject_grade (subject_id, grade_level_id),
  INDEX idx_day_time (day_of_week, start_time),
  INDEX idx_active_open (is_active, status),
  INDEX idx_tutor_day (tutor_id, day_of_week),
  
  CONSTRAINT fk_session_tutor FOREIGN KEY (tutor_id) 
    REFERENCES tutors(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_subject FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_session_grade FOREIGN KEY (grade_level_id) 
    REFERENCES grade_levels(id) ON DELETE RESTRICT,
    
  CONSTRAINT chk_students CHECK (current_students <= max_students),
  CONSTRAINT chk_time_order CHECK (start_time < end_time),
  CONSTRAINT chk_duration CHECK (duration_hours > 0 AND duration_hours <= 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 3. CREATE lesson_bookings (ĐĂNG KÝ HỌC)
-- ========================================

CREATE TABLE IF NOT EXISTS lesson_bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teaching_session_id BIGINT UNSIGNED NOT NULL,
  tutor_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  
  -- Specific lesson time
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Payment
  price INT NOT NULL COMMENT 'Copied from teaching_session at booking time',
  payment_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, paid, refunded',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  paid_at TIMESTAMP NULL,
  
  -- Lesson status
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, confirmed, completed, cancelled',
  tutor_confirmed TINYINT DEFAULT 0,
  student_confirmed TINYINT DEFAULT 0,
  
  -- Meeting
  meeting_link VARCHAR(500),
  notes TEXT COMMENT 'Student notes',
  tutor_notes TEXT COMMENT 'Tutor notes',
  
  -- Cancellation
  cancelled_at TIMESTAMP NULL,
  cancelled_by BIGINT UNSIGNED,
  cancellation_reason TEXT,
  
  -- Completion
  completed_at TIMESTAMP NULL,
  attendance_status VARCHAR(20) COMMENT 'present, absent, late',
  
  is_trial TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_student_date (student_id, lesson_date),
  INDEX idx_tutor_date (tutor_id, lesson_date),
  INDEX idx_session_date (teaching_session_id, lesson_date),
  INDEX idx_status (status),
  INDEX idx_payment (payment_status),
  INDEX idx_upcoming (lesson_date, status),
  
  CONSTRAINT fk_booking_session FOREIGN KEY (teaching_session_id) 
    REFERENCES teaching_sessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_tutor FOREIGN KEY (tutor_id) 
    REFERENCES tutors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE RESTRICT,
    
  UNIQUE KEY uk_student_session_date (student_id, teaching_session_id, lesson_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. CREATE availability_exceptions
-- ========================================

CREATE TABLE IF NOT EXISTS availability_exceptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tutor_id BIGINT UNSIGNED NOT NULL,
  exception_date DATE NOT NULL,
  exception_type VARCHAR(20) NOT NULL COMMENT 'blocked (nghỉ), available (thêm giờ)',
  start_time TIME,
  end_time TIME,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tutor_date (tutor_id, exception_date),
  
  CONSTRAINT fk_exception_tutor FOREIGN KEY (tutor_id) 
    REFERENCES tutors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. ADD INDEXES to existing tables
-- ========================================

-- tutor_availability
ALTER TABLE tutor_availability
ADD INDEX idx_tutor_day (tutor_id, day_of_week),
ADD INDEX idx_active (is_active);

-- time_slots
ALTER TABLE time_slots
ADD INDEX idx_tutor_day_shift (tutor_id, day_of_week, shift_type),
ADD INDEX idx_available (is_available);

-- lessons (keep for backward compatibility)
ALTER TABLE lessons
ADD INDEX idx_tutor_date_status (tutor_id, date, status),
ADD INDEX idx_student_date (student_id, date),
ADD INDEX idx_status (status);

-- ========================================
-- 6. CREATE TRIGGERS
-- ========================================

-- Trigger: Auto-calculate duration when inserting teaching_session
DELIMITER $$

CREATE TRIGGER before_insert_teaching_session
BEFORE INSERT ON teaching_sessions
FOR EACH ROW
BEGIN
  DECLARE hours DECIMAL(3,1);
  
  -- Calculate duration in hours
  SET hours = TIMESTAMPDIFF(MINUTE, 
    CONCAT('2000-01-01 ', NEW.start_time), 
    CONCAT('2000-01-01 ', NEW.end_time)
  ) / 60.0;
  
  SET NEW.duration_hours = hours;
END$$

CREATE TRIGGER before_update_teaching_session
BEFORE UPDATE ON teaching_sessions
FOR EACH ROW
BEGIN
  DECLARE hours DECIMAL(3,1);
  
  IF NEW.start_time != OLD.start_time OR NEW.end_time != OLD.end_time THEN
    SET hours = TIMESTAMPDIFF(MINUTE, 
      CONCAT('2000-01-01 ', NEW.start_time), 
      CONCAT('2000-01-01 ', NEW.end_time)
    ) / 60.0;
    
    SET NEW.duration_hours = hours;
  END IF;
END$$

DELIMITER ;

-- ========================================
-- 7. CREATE VIEWS for easy querying
-- ========================================

-- View: Open teaching sessions with tutor info
CREATE OR REPLACE VIEW v_open_sessions AS
SELECT 
  ts.*,
  t.full_name as tutor_name,
  t.avatar as tutor_avatar,
  t.hourly_rate,
  t.rating as tutor_rating,
  s.name as subject_name,
  gl.name as grade_name,
  (ts.max_students - ts.current_students) as available_slots
FROM teaching_sessions ts
JOIN tutors t ON t.id = ts.tutor_id
JOIN subjects s ON s.id = ts.subject_id
JOIN grade_levels gl ON gl.id = ts.grade_level_id
WHERE ts.is_active = 1 
  AND ts.status = 'open'
  AND ts.current_students < ts.max_students
  AND (ts.end_date IS NULL OR ts.end_date >= CURDATE());

-- View: Student upcoming lessons
CREATE OR REPLACE VIEW v_student_upcoming_lessons AS
SELECT 
  lb.*,
  ts.title as session_title,
  s.name as subject_name,
  gl.name as grade_name,
  t.full_name as tutor_name,
  t.phone as tutor_phone,
  t.avatar as tutor_avatar
FROM lesson_bookings lb
JOIN teaching_sessions ts ON ts.id = lb.teaching_session_id
JOIN subjects s ON s.id = ts.subject_id
JOIN grade_levels gl ON gl.id = ts.grade_level_id
JOIN tutors t ON t.id = lb.tutor_id
WHERE lb.status NOT IN ('cancelled', 'completed')
  AND lb.lesson_date >= CURDATE();

-- ========================================
-- 8. SEED DATA (Optional)
-- ========================================

-- Migrate data from time_slots to tutor_availability (if needed)
-- This is already done, just keeping track

-- ========================================
-- DONE! ✅
-- ========================================
