-- ============================================================================
-- SIMPLIFIED MIGRATION - No data to convert
-- Drop existing indexes first, then recreate with constraints
-- ============================================================================

USE lophoc_online;

-- ============================================================================
-- STEP 0: DROP EXISTING UNIQUE INDEXES (if any)
-- ============================================================================

ALTER TABLE tutors DROP INDEX IF EXISTS idx_tutors_user_id_unique;
ALTER TABLE students DROP INDEX IF EXISTS idx_students_user_id_unique;
ALTER TABLE tutor_subjects DROP INDEX IF EXISTS idx_tutor_subjects_unique;
ALTER TABLE time_slots DROP INDEX IF EXISTS idx_time_slots_unique;
ALTER TABLE reviews DROP INDEX IF EXISTS idx_reviews_lesson_unique;
ALTER TABLE escrow_payments DROP INDEX IF EXISTS idx_escrow_payment_id_unique;
ALTER TABLE wallets DROP INDEX IF EXISTS idx_wallets_owner_unique;

SELECT '✓ Step 0: Existing indexes dropped' AS status;

-- ============================================================================
-- STEP 1: FIX TYPE MISMATCH (Tables are empty - simple ALTER)
-- ============================================================================

-- Fix tutors.user_id (INT → BIGINT UNSIGNED to match users.id)
ALTER TABLE tutors 
  MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL;

-- Fix students.user_id (INT → BIGINT UNSIGNED to match users.id)
ALTER TABLE students 
  MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL;

-- Fix tutor_availability.tutor_id (VARCHAR → BIGINT UNSIGNED to match tutors.id)
ALTER TABLE tutor_availability 
  MODIFY COLUMN tutor_id BIGINT UNSIGNED NOT NULL;

-- Fix lessons.tutor_id and student_id (VARCHAR → BIGINT UNSIGNED)
ALTER TABLE lessons 
  MODIFY COLUMN tutor_id BIGINT UNSIGNED NOT NULL,
  MODIFY COLUMN student_id BIGINT UNSIGNED NOT NULL;

SELECT '✓ Step 1: Type mismatch fixed' AS status;

-- ============================================================================
-- STEP 2: ADD UNIQUE CONSTRAINTS
-- ============================================================================

-- tutors.user_id (1 user = 1 tutor profile)
ALTER TABLE tutors 
  ADD UNIQUE INDEX idx_tutors_user_id_unique (user_id);

-- students.user_id (1 user = 1 student profile)  
ALTER TABLE students 
  ADD UNIQUE INDEX idx_students_user_id_unique (user_id);

-- tutor_subjects: no duplicate (tutor, subject, grade)
ALTER TABLE tutor_subjects 
  ADD UNIQUE INDEX idx_tutor_subjects_unique (tutor_id, subject_id, grade_level_id);

-- time_slots: no duplicate time slots
ALTER TABLE time_slots 
  ADD UNIQUE INDEX idx_time_slots_unique (tutor_id, day_of_week, start_time, end_time);

-- reviews: 1 lesson = 1 review
ALTER TABLE reviews 
  ADD UNIQUE INDEX idx_reviews_lesson_unique (lesson_id);

-- escrow_payments: 1-1 with payments
ALTER TABLE escrow_payments 
  ADD UNIQUE INDEX idx_escrow_payment_id_unique (payment_id);

-- wallets: 1 owner = 1 wallet
ALTER TABLE wallets 
  ADD UNIQUE INDEX idx_wallets_owner_unique (owner_id, owner_type);

SELECT '✓ Step 2: Unique constraints added' AS status;

-- ============================================================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Users -> Tutors/Students
ALTER TABLE tutors 
  ADD CONSTRAINT fk_tutors_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE students 
  ADD CONSTRAINT fk_students_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Tutor relations
ALTER TABLE tutor_availability 
  ADD CONSTRAINT fk_tutor_availability_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE tutor_subjects 
  ADD CONSTRAINT fk_tutor_subjects_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE tutor_subjects 
  ADD CONSTRAINT fk_tutor_subjects_subject_id 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tutor_subjects 
  ADD CONSTRAINT fk_tutor_subjects_grade_level_id 
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE time_slots 
  ADD CONSTRAINT fk_time_slots_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE tutor_documents 
  ADD CONSTRAINT fk_tutor_documents_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Lessons (RESTRICT - don't allow delete if lessons exist)
ALTER TABLE lessons 
  ADD CONSTRAINT fk_lessons_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE lessons 
  ADD CONSTRAINT fk_lessons_student_id 
  FOREIGN KEY (student_id) REFERENCES students(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reviews
ALTER TABLE reviews 
  ADD CONSTRAINT fk_reviews_lesson_id 
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE reviews 
  ADD CONSTRAINT fk_reviews_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE reviews 
  ADD CONSTRAINT fk_reviews_student_id 
  FOREIGN KEY (student_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Notifications
ALTER TABLE notifications 
  ADD CONSTRAINT fk_notifications_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Enrollments
ALTER TABLE class_enrollments 
  ADD CONSTRAINT fk_enrollments_student_id 
  FOREIGN KEY (student_id) REFERENCES students(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE class_enrollments 
  ADD CONSTRAINT fk_enrollments_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE class_enrollments 
  ADD CONSTRAINT fk_enrollments_subject_id 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE class_enrollments 
  ADD CONSTRAINT fk_enrollments_grade_level_id 
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Payments & Escrow
ALTER TABLE payments 
  ADD CONSTRAINT fk_payments_enrollment_id 
  FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE payments 
  ADD CONSTRAINT fk_payments_student_id 
  FOREIGN KEY (student_id) REFERENCES students(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE escrow_payments 
  ADD CONSTRAINT fk_escrow_payments_payment_id 
  FOREIGN KEY (payment_id) REFERENCES payments(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE escrow_payments 
  ADD CONSTRAINT fk_escrow_payments_enrollment_id 
  FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Session Records
ALTER TABLE session_records 
  ADD CONSTRAINT fk_session_records_enrollment_id 
  FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE session_records 
  ADD CONSTRAINT fk_session_records_lesson_id 
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Wallets & Transactions
ALTER TABLE wallet_transactions 
  ADD CONSTRAINT fk_wallet_transactions_wallet_id 
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE payout_requests 
  ADD CONSTRAINT fk_payout_requests_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE payout_requests 
  ADD CONSTRAINT fk_payout_requests_wallet_id 
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Video Call Sessions
ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_enrollment_id 
  FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_lesson_id 
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_session_record_id 
  FOREIGN KEY (session_record_id) REFERENCES session_records(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES users(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE video_call_sessions 
  ADD CONSTRAINT fk_video_sessions_student_id 
  FOREIGN KEY (student_id) REFERENCES users(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Favorite Tutors
ALTER TABLE favorite_tutors 
  ADD CONSTRAINT fk_favorite_tutors_student_id 
  FOREIGN KEY (student_id) REFERENCES users(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE favorite_tutors 
  ADD CONSTRAINT fk_favorite_tutors_tutor_id 
  FOREIGN KEY (tutor_id) REFERENCES tutors(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Student Credits
ALTER TABLE student_credits 
  ADD CONSTRAINT fk_student_credits_student_id 
  FOREIGN KEY (student_id) REFERENCES students(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE student_credits 
  ADD CONSTRAINT fk_student_credits_source_enrollment 
  FOREIGN KEY (source_enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE student_credits 
  ADD CONSTRAINT fk_student_credits_used_enrollment 
  FOREIGN KEY (used_for_enrollment_id) REFERENCES class_enrollments(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

SELECT '✓ Step 3: Foreign keys added' AS status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
    AND CONSTRAINT_TYPE IN ('FOREIGN KEY', 'UNIQUE')
ORDER BY TABLE_NAME, CONSTRAINT_TYPE;

SELECT '✅ Migration completed successfully!' AS final_status;
