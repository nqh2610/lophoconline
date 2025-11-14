-- Complete System Overhaul: Clean migration with fresh test data

-- ========================================
-- STEP 1: Update lesson_bookings to reference tutor_availability
-- ========================================

-- First, drop the FK constraint
ALTER TABLE lesson_bookings DROP FOREIGN KEY fk_booking_session;

-- Add new column for tutor_availability reference
ALTER TABLE lesson_bookings ADD COLUMN availability_id BIGINT UNSIGNED NULL AFTER teaching_session_id;

-- Map bookings to tutor_availability
UPDATE lesson_bookings SET availability_id = 182 WHERE id = 3;
UPDATE lesson_bookings SET availability_id = 151 WHERE id = 4;
UPDATE lesson_bookings SET availability_id = 186 WHERE id = 5;

-- Make teaching_session_id nullable and availability_id NOT NULL
ALTER TABLE lesson_bookings 
    MODIFY COLUMN teaching_session_id BIGINT UNSIGNED NULL,
    MODIFY COLUMN availability_id BIGINT UNSIGNED NOT NULL;

-- Add FK to tutor_availability
ALTER TABLE lesson_bookings 
    ADD CONSTRAINT fk_booking_availability 
    FOREIGN KEY (availability_id) 
    REFERENCES tutor_availability(id) 
    ON DELETE RESTRICT;

SELECT '✅ Bookings migrated to tutor_availability' as status;

-- ========================================
-- STEP 2: Drop teaching_sessions table
-- ========================================

DROP TABLE IF EXISTS teaching_sessions;
SELECT '✅ teaching_sessions dropped' as status;

-- ========================================
-- STEP 3: Drop day_of_week column
-- ========================================

ALTER TABLE tutor_availability DROP COLUMN day_of_week;
SELECT '✅ day_of_week column dropped' as status;

-- ========================================
-- STEP 4: Drop backup tables
-- ========================================

DROP TABLE IF EXISTS tutor_availability_backup;
DROP TABLE IF EXISTS time_slots_backup;
DROP TABLE IF EXISTS teaching_sessions_backup;
SELECT '✅ Backup tables dropped' as status;

-- ========================================
-- STEP 5: Seed fresh test data
-- ========================================

DELETE FROM tutor_availability;

-- Tutor 106: Math
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(106, '[1,3,5]', 'morning', '08:00', '10:00', 1),
(106, '[2,4]', 'morning', '09:00', '11:00', 1),
(106, '[1,2,3,4,5]', 'afternoon', '14:00', '16:00', 1),
(106, '[1,3,5]', 'evening', '19:00', '21:00', 1),
(106, '[0,6]', 'afternoon', '14:00', '18:00', 1);

-- Tutor 107: English
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(107, '[1,3,5]', 'morning', '07:00', '09:00', 1),
(107, '[2,4,6]', 'morning', '08:00', '10:00', 1),
(107, '[1,2,3,4,5]', 'afternoon', '13:00', '15:00', 1),
(107, '[2,4]', 'afternoon', '14:00', '16:00', 1),
(107, '[0]', 'afternoon', '15:00', '19:00', 1),
(107, '[1,3,5]', 'evening', '18:00', '20:00', 1);

-- Tutor 108-115: Other subjects
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(108, '[2,4]', 'morning', '08:00', '10:00', 1),
(108, '[1,3,5]', 'afternoon', '14:00', '16:00', 1),
(108, '[1,2,3,4,5]', 'evening', '17:00', '20:00', 1),
(108, '[6]', 'afternoon', '14:00', '18:00', 1),
(109, '[1,3,5]', 'morning', '08:00', '11:00', 1),
(109, '[2,4]', 'afternoon', '14:00', '17:00', 1),
(109, '[1,3,5]', 'evening', '18:00', '21:00', 1),
(109, '[0,6]', 'morning', '09:00', '12:00', 1),
(110, '[1,2,3,4,5]', 'morning', '07:00', '09:00', 1),
(110, '[1,3,5]', 'afternoon', '14:00', '16:00', 1),
(110, '[2,4]', 'evening', '18:00', '21:00', 1),
(110, '[6]', 'afternoon', '15:00', '18:00', 1),
(111, '[1,3,5]', 'morning', '08:00', '10:00', 1),
(111, '[2,4,6]', 'afternoon', '14:00', '17:00', 1),
(111, '[1,3,5]', 'evening', '19:00', '21:00', 1),
(112, '[1,2,3,4,5]', 'morning', '08:00', '10:00', 1),
(112, '[1,3]', 'afternoon', '14:00', '16:00', 1),
(112, '[2,4]', 'evening', '19:00', '21:00', 1),
(113, '[1,3,5]', 'morning', '09:00', '11:00', 1),
(113, '[2,4]', 'afternoon', '14:00', '16:00', 1),
(113, '[1,3,5]', 'evening', '18:00', '20:00', 1),
(114, '[2,4,6]', 'afternoon', '14:00', '17:00', 1),
(114, '[1,3,5]', 'evening', '18:00', '20:00', 1),
(114, '[0]', 'afternoon', '14:00', '18:00', 1),
(115, '[1,3,5]', 'afternoon', '14:00', '17:00', 1),
(115, '[2,4]', 'evening', '18:00', '20:00', 1),
(115, '[0,6]', 'afternoon', '13:00', '17:00', 1);

SELECT '✅ Fresh test data seeded' as status;

-- ========================================
-- STEP 6: Update bookings
-- ========================================

DELETE FROM lesson_bookings;

SET @avail_106_morning = (SELECT id FROM tutor_availability WHERE tutor_id = 106 AND start_time = '08:00' LIMIT 1);
SET @avail_106_evening = (SELECT id FROM tutor_availability WHERE tutor_id = 106 AND start_time = '19:00' LIMIT 1);
SET @avail_107_afternoon = (SELECT id FROM tutor_availability WHERE tutor_id = 107 AND start_time = '14:00' LIMIT 1);
SET @avail_108_evening = (SELECT id FROM tutor_availability WHERE tutor_id = 108 AND start_time = '17:00' LIMIT 1);
SET @avail_109_morning = (SELECT id FROM tutor_availability WHERE tutor_id = 109 AND start_time = '08:00' LIMIT 1);

INSERT INTO lesson_bookings 
(availability_id, tutor_id, student_id, lesson_date, start_time, end_time, price, status, tutor_confirmed, student_confirmed, payment_status)
VALUES
(@avail_106_morning, 106, 1, '2025-10-28', '08:00', '10:00', 200000, 'confirmed', 1, 1, 'paid'),
(@avail_106_evening, 106, 2, '2025-10-28', '19:00', '21:00', 200000, 'confirmed', 1, 1, 'paid'),
(@avail_107_afternoon, 107, 1, '2025-10-29', '14:00', '16:00', 180000, 'pending', 0, 1, 'pending'),
(@avail_108_evening, 108, 3, '2025-10-30', '17:00', '19:00', 220000, 'confirmed', 1, 1, 'paid'),
(@avail_109_morning, 109, 2, '2025-11-01', '08:00', '10:00', 190000, 'pending', 1, 0, 'pending');

SELECT '✅ Bookings created' as status;

-- Final verification
SELECT 'FINAL STATE' as header;
SELECT COUNT(DISTINCT tutor_id) as tutors_with_availability FROM tutor_availability;
SELECT COUNT(*) as total_slots FROM tutor_availability;
SELECT COUNT(*) as active_bookings FROM lesson_bookings;
SELECT '✅ COMPLETE!' as result;
