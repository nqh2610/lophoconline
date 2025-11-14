-- ============================================
-- PERFORMANCE INDEXES FOR LOPHOC.ONLINE
-- Tối ưu hóa cho queries phổ biến nhất
-- NOTE: MySQL columns use snake_case
-- ============================================

-- TUTORS TABLE - Các cột được filter/sort thường xuyên
CREATE INDEX idx_tutors_verification_active 
ON tutors(verification_status, is_active, rating DESC);

CREATE INDEX idx_tutors_hourly_rate 
ON tutors(hourly_rate, rating DESC);

CREATE INDEX idx_tutors_experience 
ON tutors(experience, rating DESC);

CREATE INDEX idx_tutors_fullname 
ON tutors(full_name);

-- TUTOR_SUBJECTS TABLE - Cực kỳ quan trọng cho filtering
CREATE INDEX idx_tutor_subjects_lookup 
ON tutor_subjects(tutor_id, subject_id, grade_level_id);

CREATE INDEX idx_tutor_subjects_subject 
ON tutor_subjects(subject_id, tutor_id);

CREATE INDEX idx_tutor_subjects_grade 
ON tutor_subjects(grade_level_id, tutor_id);

-- TIME_SLOTS TABLE - Filtering theo thời gian
CREATE INDEX idx_time_slots_availability 
ON time_slots(tutor_id, is_available, day_of_week, shift_type);

CREATE INDEX idx_time_slots_day_shift 
ON time_slots(day_of_week, shift_type, is_available);

-- LESSONS TABLE - Thường query theo studentId/tutorId và status
CREATE INDEX idx_lessons_student 
ON lessons(student_id, status, date DESC);

CREATE INDEX idx_lessons_tutor 
ON lessons(tutor_id, status, date DESC);

CREATE INDEX idx_lessons_date_status 
ON lessons(date, status);

-- REVIEWS TABLE - Query theo tutorId để hiển thị
CREATE INDEX idx_reviews_tutor 
ON reviews(tutor_id, created_at DESC);

CREATE INDEX idx_reviews_lesson 
ON reviews(lesson_id);

-- NOTIFICATIONS TABLE - Query theo userId và isRead
CREATE INDEX idx_notifications_user 
ON notifications(user_id, is_read, created_at DESC);

-- CLASS_ENROLLMENTS TABLE - Query theo student/tutor và status
CREATE INDEX idx_enrollments_student 
ON class_enrollments(student_id, status, created_at DESC);

CREATE INDEX idx_enrollments_tutor 
ON class_enrollments(tutor_id, status, created_at DESC);

-- PAYMENTS TABLE - Query theo enrollment và status
CREATE INDEX idx_payments_enrollment 
ON payments(enrollment_id, status);

CREATE INDEX idx_payments_student 
ON payments(student_id, status, created_at DESC);

CREATE INDEX idx_payments_transaction_code 
ON payments(transaction_code);

-- SESSION_RECORDS TABLE - Query theo enrollment
CREATE INDEX idx_session_records_enrollment 
ON session_records(enrollment_id, status, date DESC);

-- WALLETS TABLE - Query theo owner
CREATE INDEX idx_wallets_owner 
ON wallets(owner_id, owner_type);

-- WALLET_TRANSACTIONS TABLE - Query theo wallet và type
CREATE INDEX idx_wallet_transactions_wallet 
ON wallet_transactions(wallet_id, created_at DESC);

CREATE INDEX idx_wallet_transactions_related 
ON wallet_transactions(related_id, related_type);

-- PAYOUT_REQUESTS TABLE - Query theo tutor và status
CREATE INDEX idx_payout_requests_tutor 
ON payout_requests(tutor_id, status, created_at DESC);

-- USERS TABLE - Query theo username/email khi login
CREATE INDEX idx_users_username 
ON users(username);

CREATE INDEX idx_users_email 
ON users(email);

CREATE INDEX idx_users_role_active 
ON users(role, is_active);

-- LOGIN_ATTEMPTS TABLE - Để rate limiting
CREATE INDEX idx_login_attempts_username 
ON login_attempts(username, attempted_at DESC);

-- VIDEO_CALL_SESSIONS TABLE
CREATE INDEX idx_video_sessions_tokens 
ON video_call_sessions(access_token, status);

CREATE INDEX idx_video_sessions_student_tutor 
ON video_call_sessions(student_id, tutor_id, status);

CREATE INDEX idx_video_sessions_scheduled 
ON video_call_sessions(scheduled_start_time, status);

-- AUDIT_LOGS TABLE - Để debug và kiểm tra
CREATE INDEX idx_audit_logs_entity 
ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX idx_audit_logs_user 
ON audit_logs(user_id, created_at DESC);

-- ============================================
-- VERIFY INDEXES
-- ============================================
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    SEQ_IN_INDEX,
    COLUMN_NAME,
    CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (
        'tutors', 'tutor_subjects', 'time_slots', 
        'lessons', 'reviews', 'notifications',
        'class_enrollments', 'payments', 'session_records',
        'wallets', 'wallet_transactions', 'payout_requests',
        'users', 'video_call_sessions', 'audit_logs'
    )
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
