-- ============================================================================
-- FIX CRITICAL DATABASE ISSUES - LOPHOC.ONLINE
-- PHAN 1: FIX TYPE MISMATCH + ADD FOREIGN KEYS + ADD UNIQUE CONSTRAINTS
-- ============================================================================
-- 
-- CANH BAO: Script nay se thay doi database structure!
-- - Backup database truoc khi chay: mysqldump -u user -p database > backup.sql
-- - Test tren staging truoc
-- - Estimate downtime: 10-30 phut (tuy data size)
-- 
-- ============================================================================

USE lophoc_online; -- Thay ten database neu khac

-- ============================================================================
-- STEP 1: FIX TYPE MISMATCH - tutor_availability table
-- ============================================================================

-- IMPORTANT: Migrate existing data first if table has data
-- Check if data exists
SELECT COUNT(*) as row_count FROM tutor_availability;

-- Create temp column for migration
ALTER TABLE tutor_availability 
  ADD COLUMN tutor_id_new INT NULL AFTER tutor_id;

-- Migrate data: Convert existing VARCHAR to INT
-- Assuming tutorId currently stores tutor.id as string
UPDATE tutor_availability 
  SET tutor_id_new = CAST(tutor_id AS UNSIGNED)
  WHERE tutor_id REGEXP '^[0-9]+$';

-- Check for any invalid data that couldn't be converted
SELECT * FROM tutor_availability WHERE tutor_id_new IS NULL;

-- If no invalid data, proceed with migration
ALTER TABLE tutor_availability 
  DROP COLUMN tutor_id,
  CHANGE COLUMN tutor_id_new tutor_id INT NOT NULL;

-- Recreate index
CREATE INDEX idx_tutor_availability_tutor 
  ON tutor_availability(tutor_id, day_of_week, is_active);

-- ============================================================================
-- STEP 2: FIX TYPE MISMATCH - lessons table  
-- ============================================================================

-- Check if data exists
SELECT COUNT(*) as row_count FROM lessons;

-- Create temp columns for migration
ALTER TABLE lessons 
  ADD COLUMN tutor_id_new INT NULL AFTER tutor_id,
  ADD COLUMN student_id_new INT NULL AFTER student_id;

-- Migrate data: Convert existing VARCHAR to INT
UPDATE lessons 
  SET tutor_id_new = CAST(tutor_id AS UNSIGNED),
      student_id_new = CAST(student_id AS UNSIGNED)
  WHERE tutor_id REGEXP '^[0-9]+$' 
    AND student_id REGEXP '^[0-9]+$';

-- Check for any invalid data
SELECT * FROM lessons WHERE tutor_id_new IS NULL OR student_id_new IS NULL;

-- If no invalid data, proceed
ALTER TABLE lessons 
  DROP COLUMN tutor_id,
  DROP COLUMN student_id,
  CHANGE COLUMN tutor_id_new tutor_id INT NOT NULL,
  CHANGE COLUMN student_id_new student_id INT NOT NULL;

-- Tao lai indexes
CREATE INDEX idx_lessons_student ON lessons(student_id, status, date DESC);
CREATE INDEX idx_lessons_tutor ON lessons(tutor_id, status, date DESC);
CREATE INDEX idx_lessons_date_status ON lessons(date, status);

-- ============================================================================
-- STEP 3: ADD MISSING UNIQUE CONSTRAINTS
-- ============================================================================

-- tutors.userId should be UNIQUE (1 user = 1 tutor profile)
ALTER TABLE tutors 
  ADD UNIQUE INDEX idx_tutors_user_id_unique (user_id);

-- students.userId should be UNIQUE (1 user = 1 student profile)
ALTER TABLE students 
  ADD UNIQUE INDEX idx_students_user_id_unique (user_id);

-- tutor_subjects: 1 tutor khong the day cung mon + lop 2 lan
ALTER TABLE tutor_subjects 
  ADD UNIQUE INDEX idx_tutor_subjects_unique (tutor_id, subject_id, grade_level_id);

-- time_slots: 1 tutor khong the co 2 time slots trung lap
ALTER TABLE time_slots 
  ADD UNIQUE INDEX idx_time_slots_unique (tutor_id, day_of_week, start_time, end_time);

-- reviews: 1 lesson chi co 1 review
ALTER TABLE reviews 
  ADD UNIQUE INDEX idx_reviews_lesson_unique (lesson_id);

-- escrow_payments: 1-1 relationship voi payments
ALTER TABLE escrow_payments 
  ADD UNIQUE INDEX idx_escrow_payment_id_unique (payment_id);

-- wallets: 1 owner chi co 1 wallet
ALTER TABLE wallets 
  ADD UNIQUE INDEX idx_wallets_owner_unique (owner_id, owner_type);

-- payments: transaction_code nen UNIQUE (neu khong phai NULL)
-- CHU Y: MySQL khong enforce UNIQUE tren NULL values (OK for our case)
ALTER TABLE payments 
  ADD UNIQUE INDEX idx_payments_transaction_code_unique (transaction_code);

-- video_call_sessions: roomName + accessToken nen UNIQUE
ALTER TABLE video_call_sessions 
  ADD UNIQUE INDEX idx_video_sessions_room_unique (room_name),
  ADD UNIQUE INDEX idx_video_sessions_token_unique (access_token);

-- ============================================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS (CRITICAL!)
-- ============================================================================

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------
-- USERS RELATED
-- ------------------------------------------------------------------------

-- tutors.userId -> users.id (ON DELETE CASCADE: xoa user -> xoa tutor)
ALTER TABLE tutors 
  ADD CONSTRAINT fk_tutors_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- students.userId -> users.id
ALTER TABLE students 
  ADD CONSTRAINT fk_students_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- TUTORS RELATED
-- ------------------------------------------------------------------------

-- tutor_availability.tutorId -> tutors.id
ALTER TABLE tutor_availability 
  ADD CONSTRAINT fk_tutor_availability_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- tutor_subjects.tutorId -> tutors.id
ALTER TABLE tutor_subjects 
  ADD CONSTRAINT fk_tutor_subjects_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- tutor_subjects.subjectId -> subjects.id
ALTER TABLE tutor_subjects 
  ADD CONSTRAINT fk_tutor_subjects_subject_id 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- tutor_subjects.gradeLevelId -> grade_levels.id
ALTER TABLE tutor_subjects 
  ADD CONSTRAINT fk_tutor_subjects_grade_level_id 
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- time_slots.tutorId -> tutors.id
ALTER TABLE time_slots 
  ADD CONSTRAINT fk_time_slots_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- tutor_documents.tutorId -> tutors.id
ALTER TABLE tutor_documents 
  ADD CONSTRAINT fk_tutor_documents_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- LESSONS RELATED (ON DELETE RESTRICT - khong cho xoa khi co lesson)
-- ------------------------------------------------------------------------

-- lessons.tutorId -> tutors.id
ALTER TABLE lessons 
  ADD CONSTRAINT fk_lessons_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- lessons.studentId -> students.id
ALTER TABLE lessons 
  ADD CONSTRAINT fk_lessons_student_id 
  FOREIGN KEY (student_id) REFERENCES students(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- REVIEWS RELATED
-- ------------------------------------------------------------------------

-- reviews.lessonId -> lessons.id
ALTER TABLE reviews 
  ADD CONSTRAINT fk_reviews_lesson_id 
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- reviews.tutorId -> tutors.id
ALTER TABLE reviews 
  ADD CONSTRAINT fk_reviews_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- reviews.studentId -> users.id (vi student co the chua co profile)
ALTER TABLE reviews 
  ADD CONSTRAINT fk_reviews_student_id 
  FOREIGN KEY (student_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- NOTIFICATIONS RELATED
-- ------------------------------------------------------------------------

-- notifications.userId -> users.id
ALTER TABLE notifications 
  ADD CONSTRAINT fk_notifications_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- ENROLLMENTS RELATED
-- ------------------------------------------------------------------------

-- class_enrollments.studentId -> students.id
ALTER TABLE class_enrollments 
  ADD CONSTRAINT fk_enrollments_student_id 
  FOREIGN KEY (student_id) REFERENCES students(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- class_enrollments.tutorId -> tutors.id
ALTER TABLE class_enrollments 
  ADD CONSTRAINT fk_enrollments_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- class_enrollments.subjectId -> subjects.id
ALTER TABLE class_enrollments 
  ADD CONSTRAINT fk_enrollments_subject_id 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- class_enrollments.gradeLevelId -> grade_levels.id
ALTER TABLE class_enrollments 
  ADD CONSTRAINT fk_enrollments_grade_level_id 
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- PAYMENTS & ESCROW RELATED
-- ------------------------------------------------------------------------

-- payments.enrollmentId -> class_enrollments.id
ALTER TABLE payments 
  ADD CONSTRAINT fk_payments_enrollment_id 
  FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- payments.studentId -> students.id
ALTER TABLE payments 
  ADD CONSTRAINT fk_payments_student_id 
  FOREIGN KEY (student_id) REFERENCES students(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- escrow_payments.paymentId -> payments.id
ALTER TABLE escrow_payments 
  ADD CONSTRAINT fk_escrow_payments_payment_id 
  FOREIGN KEY (payment_id) REFERENCES payments(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- escrow_payments.enrollmentId -> class_enrollments.id
ALTER TABLE escrow_payments 
  ADD CONSTRAINT fk_escrow_payments_enrollment_id 
  FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- SESSION RECORDS RELATED
-- ------------------------------------------------------------------------

-- session_records.enrollmentId -> class_enrollments.id
ALTER TABLE session_records 
  ADD CONSTRAINT fk_session_records_enrollment_id 
  FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- session_records.lessonId -> lessons.id (nullable)
ALTER TABLE session_records 
  ADD CONSTRAINT fk_session_records_lesson_id 
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- WALLETS & TRANSACTIONS RELATED
-- ------------------------------------------------------------------------

-- wallets: No FK (ownerId co the la user hoac system=0)

-- wallet_transactions.walletId -> wallets.id
ALTER TABLE wallet_transactions 
  ADD CONSTRAINT fk_wallet_transactions_wallet_id 
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- payout_requests.tutorId -> tutors.id
ALTER TABLE payout_requests 
  ADD CONSTRAINT fk_payout_requests_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- payout_requests.walletId -> wallets.id
ALTER TABLE payout_requests 
  ADD CONSTRAINT fk_payout_requests_wallet_id 
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- VIDEO CALL SESSIONS RELATED
-- ------------------------------------------------------------------------

-- video_call_sessions.enrollmentId -> class_enrollments.id (nullable)
ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_enrollment_id 
  FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- video_call_sessions.lessonId -> lessons.id (nullable)
ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_lesson_id 
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- video_call_sessions.sessionRecordId -> session_records.id (nullable)
ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_session_record_id 
  FOREIGN KEY (session_record_id) REFERENCES session_records(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- video_call_sessions.tutorId -> users.id
ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES users(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- video_call_sessions.studentId -> users.id
ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_student_id 
  FOREIGN KEY (student_id) REFERENCES users(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- FAVORITE TUTORS RELATED
-- ------------------------------------------------------------------------

-- favorite_tutors.studentId -> users.id
ALTER TABLE favorite_tutors 
  ADD CONSTRAINT fk_favorite_tutors_student_id 
  FOREIGN KEY (student_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- favorite_tutors.tutorId -> tutors.id
ALTER TABLE favorite_tutors 
  ADD CONSTRAINT fk_favorite_tutors_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------------
-- STUDENT CREDITS RELATED
-- ------------------------------------------------------------------------

-- student_credits.studentId -> students.id
ALTER TABLE student_credits 
  ADD CONSTRAINT fk_student_credits_student_id 
  FOREIGN KEY (student_id) REFERENCES students(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- student_credits.sourceEnrollmentId -> class_enrollments.id
ALTER TABLE student_credits 
  ADD CONSTRAINT fk_student_credits_source_enrollment 
  FOREIGN KEY (source_enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- student_credits.usedForEnrollmentId -> class_enrollments.id (nullable)
ALTER TABLE student_credits 
  ADD CONSTRAINT fk_student_credits_used_enrollment 
  FOREIGN KEY (used_for_enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- STEP 5: VERIFY CONSTRAINTS
-- ============================================================================

-- Check all foreign keys
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- Check all unique constraints
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS,
    NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
    AND NON_UNIQUE = 0
    AND INDEX_NAME != 'PRIMARY'
ORDER BY TABLE_NAME, INDEX_NAME;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Database structure fixed successfully!' AS status;
SELECT 'Total Foreign Keys Added: ~35' AS fk_count;
SELECT 'Total Unique Constraints Added: ~10' AS unique_count;
SELECT 'Next: Run create-performance-indexes.sql' AS next_step;
