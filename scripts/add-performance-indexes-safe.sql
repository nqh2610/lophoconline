-- ==========================================
-- ADD PERFORMANCE INDEXES (SAFE VERSION)
-- ==========================================
-- This script safely adds indexes, skipping if they already exist
-- Compatible with MariaDB/MySQL
-- ==========================================

DELIMITER $$

DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$
CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(128),
    IN indexName VARCHAR(128),
    IN indexColumns VARCHAR(256)
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;

    -- Check if index exists
    SELECT COUNT(1) INTO indexExists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
        AND table_name = tableName
        AND index_name = indexName;

    -- Create index if it doesn't exist
    IF indexExists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, ' (', indexColumns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✓ Created index: ', indexName) AS status;
    ELSE
        SELECT CONCAT('⊗ Skipped (exists): ', indexName) AS status;
    END IF;
END$$

DELIMITER ;

-- Now add all indexes using the procedure
CALL AddIndexIfNotExists('users', 'idx_users_email', 'email');
CALL AddIndexIfNotExists('users', 'idx_users_username', 'username');
CALL AddIndexIfNotExists('users', 'idx_users_full_name', 'full_name');

CALL AddIndexIfNotExists('tutors', 'idx_tutors_user_id', 'user_id');
CALL AddIndexIfNotExists('tutors', 'idx_tutors_verification_status', 'verification_status');
-- ✅ NEW: Critical indexes for tutor filtering and search
CALL AddIndexIfNotExists('tutors', 'idx_tutors_active_verified_approved', 'is_active, verification_status, approval_status');
CALL AddIndexIfNotExists('tutors', 'idx_tutors_hourly_rate', 'hourly_rate');
CALL AddIndexIfNotExists('tutors', 'idx_tutors_experience', 'experience');
CALL AddIndexIfNotExists('tutors', 'idx_tutors_rating', 'rating');

CALL AddIndexIfNotExists('students', 'idx_students_user_id', 'user_id');
CALL AddIndexIfNotExists('students', 'idx_students_grade_level', 'grade_level_id');

CALL AddIndexIfNotExists('tutor_availability', 'idx_tutor_avail_tutor_id', 'tutor_id');
-- ✅ NEW: Indexes for availability filtering
CALL AddIndexIfNotExists('tutor_availability', 'idx_tutor_avail_active', 'is_active');
CALL AddIndexIfNotExists('tutor_availability', 'idx_tutor_avail_shift', 'shift_type');
CALL AddIndexIfNotExists('tutor_availability', 'idx_tutor_avail_tutor_shift', 'tutor_id, shift_type, is_active');

CALL AddIndexIfNotExists('class_enrollments', 'idx_class_enroll_student', 'student_id');
CALL AddIndexIfNotExists('class_enrollments', 'idx_class_enroll_tutor', 'tutor_id');
CALL AddIndexIfNotExists('class_enrollments', 'idx_class_enroll_status', 'status');
CALL AddIndexIfNotExists('class_enrollments', 'idx_class_enroll_subject', 'subject_id');
CALL AddIndexIfNotExists('class_enrollments', 'idx_class_enroll_grade', 'grade_level_id');
CALL AddIndexIfNotExists('class_enrollments', 'idx_class_enroll_student_status', 'student_id, status');
CALL AddIndexIfNotExists('class_enrollments', 'idx_class_enroll_tutor_status', 'tutor_id, status');

CALL AddIndexIfNotExists('transactions', 'idx_transactions_student', 'student_id');
CALL AddIndexIfNotExists('transactions', 'idx_transactions_tutor', 'tutor_id');
CALL AddIndexIfNotExists('transactions', 'idx_transactions_lesson', 'lesson_id');
CALL AddIndexIfNotExists('transactions', 'idx_transactions_status', 'status');

CALL AddIndexIfNotExists('notifications', 'idx_notifications_user', 'user_id');
CALL AddIndexIfNotExists('notifications', 'idx_notifications_read', 'is_read');
CALL AddIndexIfNotExists('notifications', 'idx_notifications_user_read', 'user_id, is_read');
CALL AddIndexIfNotExists('notifications', 'idx_notifications_created', 'created_at');

CALL AddIndexIfNotExists('subjects', 'idx_subjects_active', 'is_active');
CALL AddIndexIfNotExists('grade_levels', 'idx_grade_levels_active', 'is_active');
CALL AddIndexIfNotExists('grade_levels', 'idx_grade_levels_sort', 'sort_order');

CALL AddIndexIfNotExists('trial_bookings', 'idx_trial_booking_tutor_status', 'tutor_id, status');
CALL AddIndexIfNotExists('trial_bookings', 'idx_trial_booking_student_status', 'student_id, status');
CALL AddIndexIfNotExists('trial_bookings', 'idx_trial_booking_student_tutor', 'student_id, tutor_id');
CALL AddIndexIfNotExists('trial_bookings', 'idx_trial_booking_availability', 'availability_id');

CALL AddIndexIfNotExists('tutor_subjects', 'idx_tutor_subjects_tutor_id', 'tutor_id');
CALL AddIndexIfNotExists('tutor_subjects', 'idx_tutor_subjects_subject_id', 'subject_id');
CALL AddIndexIfNotExists('tutor_subjects', 'idx_tutor_subjects_grade_id', 'grade_level_id');
CALL AddIndexIfNotExists('tutor_subjects', 'idx_tutor_subjects_composite', 'tutor_id, subject_id, grade_level_id');

-- Clean up
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

SELECT '✅ Performance indexes installation complete!' AS final_status;
