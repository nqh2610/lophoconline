-- Performance Optimization: Add database indexes for frequently queried fields
-- This dramatically improves query performance when data grows

-- ============================================
-- TUTORS TABLE INDEXES
-- ============================================

-- Index on occupationId (used in JOIN in getAllTutors)
CREATE INDEX IF NOT EXISTS idx_tutors_occupation_id
ON tutors(occupation_id);

-- Composite index for common filters (active, verified, approved tutors)
CREATE INDEX IF NOT EXISTS idx_tutors_status
ON tutors(is_active, verification_status, approval_status);

-- Index on hourlyRate for price range filters
CREATE INDEX IF NOT EXISTS idx_tutors_hourly_rate
ON tutors(hourly_rate);

-- Index on rating for sorting
CREATE INDEX IF NOT EXISTS idx_tutors_rating
ON tutors(rating DESC);

-- Index on fullName for search
CREATE INDEX IF NOT EXISTS idx_tutors_full_name
ON tutors(full_name);

-- ============================================
-- TUTOR_SUBJECTS TABLE INDEXES
-- ============================================

-- Composite index on tutorId + subjectId (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_tutor_subject
ON tutor_subjects(tutor_id, subject_id);

-- Index on gradeLevelId for filtering
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_grade_level
ON tutor_subjects(grade_level_id);

-- Composite index on all three columns for optimal JOIN performance
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_composite
ON tutor_subjects(tutor_id, subject_id, grade_level_id);

-- ============================================
-- TUTOR_AVAILABILITY TABLE INDEXES
-- ============================================

-- Index on tutorId (used in WHERE clause for filtering)
CREATE INDEX IF NOT EXISTS idx_tutor_availability_tutor_id
ON tutor_availability(tutor_id);

-- Index on shiftType for shift filtering
CREATE INDEX IF NOT EXISTS idx_tutor_availability_shift_type
ON tutor_availability(shift_type);

-- Composite index on tutorId + isActive (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_tutor_availability_tutor_active
ON tutor_availability(tutor_id, is_active);

-- Index on startTime for sorting availability slots
CREATE INDEX IF NOT EXISTS idx_tutor_availability_start_time
ON tutor_availability(start_time);

-- ============================================
-- SUBJECTS & GRADE_LEVELS TABLE INDEXES
-- ============================================

-- Index on isActive for subjects (filtering active subjects)
CREATE INDEX IF NOT EXISTS idx_subjects_is_active
ON subjects(is_active);

-- Index on isActive for grade_levels (filtering active grades)
CREATE INDEX IF NOT EXISTS idx_grade_levels_is_active
ON grade_levels(is_active);

-- Index on category for grade_levels (used in filtering)
CREATE INDEX IF NOT EXISTS idx_grade_levels_category
ON grade_levels(category);

-- Index on sortOrder for grade_levels (used in ordering)
CREATE INDEX IF NOT EXISTS idx_grade_levels_sort_order
ON grade_levels(sort_order);

-- Composite index on subjectId + isActive for grade_levels
CREATE INDEX IF NOT EXISTS idx_grade_levels_subject_active
ON grade_levels(subject_id, is_active);

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Index on username for login (already primary/unique, but explicit for clarity)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Index on email for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Index on isActive for filtering active users
CREATE INDEX IF NOT EXISTS idx_users_is_active
ON users(is_active);

-- ============================================
-- LOGIN_ATTEMPTS TABLE INDEXES
-- ============================================

-- Composite index for failed login attempts query
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time
ON login_attempts(username, attempted_at, successful);

-- Index on attemptedAt for time-based cleanup
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at
ON login_attempts(attempted_at);

-- ============================================
-- VERIFY INDEXES
-- ============================================

SELECT
    'Index creation complete! Run SHOW INDEX FROM <table_name> to verify.' as message;

-- Example to check indexes:
-- SHOW INDEX FROM tutors;
-- SHOW INDEX FROM tutor_subjects;
-- SHOW INDEX FROM tutor_availability;
