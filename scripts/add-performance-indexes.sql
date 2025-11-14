-- ==========================================
-- ADD PERFORMANCE INDEXES
-- ==========================================
-- Optimize query performance for common operations
-- Note: Using IF NOT EXISTS to avoid duplicate key errors
-- ==========================================

-- USERS table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- TUTORS table indexes
CREATE INDEX IF NOT EXISTS idx_tutors_user_id ON tutors(user_id);
CREATE INDEX IF NOT EXISTS idx_tutors_verification_status ON tutors(verification_status);

-- STUDENTS table indexes
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON students(grade_level_id);

-- TUTOR_AVAILABILITY indexes
CREATE INDEX IF NOT EXISTS idx_tutor_avail_tutor_id ON tutor_availability(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_avail_day ON tutor_availability(day_of_week);

-- CLASS_ENROLLMENTS indexes
CREATE INDEX IF NOT EXISTS idx_class_enroll_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enroll_tutor ON class_enrollments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_class_enroll_status ON class_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_class_enroll_subject ON class_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_enroll_grade ON class_enrollments(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_class_enroll_student_status ON class_enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_class_enroll_tutor_status ON class_enrollments(tutor_id, status);

-- TRANSACTIONS indexes
CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tutor ON transactions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_lesson ON transactions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- NOTIFICATIONS indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- SUBJECTS & GRADE_LEVELS indexes
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);
CREATE INDEX IF NOT EXISTS idx_grade_levels_active ON grade_levels(is_active);
CREATE INDEX IF NOT EXISTS idx_grade_levels_sort ON grade_levels(sort_order);

-- TRIAL_BOOKINGS composite indexes
CREATE INDEX IF NOT EXISTS idx_trial_booking_tutor_status ON trial_bookings(tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_trial_booking_student_status ON trial_bookings(student_id, status);
-- ✅ CRITICAL: Index for validateBooking - check if student already has trial with tutor
CREATE INDEX IF NOT EXISTS idx_trial_booking_student_tutor ON trial_bookings(student_id, tutor_id);
-- ✅ Index for availability_id lookup
CREATE INDEX IF NOT EXISTS idx_trial_booking_availability ON trial_bookings(availability_id);

-- TUTOR_SUBJECTS composite indexes for filtering
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_tutor_id ON tutor_subjects(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_subject_id ON tutor_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_grade_id ON tutor_subjects(grade_level_id);
-- ✅ CRITICAL: Composite index for tutor + subject + grade filtering
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_composite ON tutor_subjects(tutor_id, subject_id, grade_level_id);

-- USERS full_name index (for search by tutor name)
-- Note: This may already exist from schema definition
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

SELECT 'Performance indexes added successfully' AS status;
