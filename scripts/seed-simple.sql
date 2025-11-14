-- ==============================================
-- Simple seed script for test data
-- ==============================================

-- Clear existing bookings for these tutors first
DELETE FROM lesson_bookings WHERE tutor_id IN (106, 107, 108, 109, 110, 111, 112, 113, 114, 115);
SELECT '✓ Old test bookings cleared' AS status;

-- Clear existing test data
DELETE FROM tutor_availability WHERE tutor_id IN (106, 107, 108, 109, 110, 111, 112, 113, 114, 115);
SELECT '✓ Old test data cleared' AS status;

-- Seed comprehensive availability for 10 tutors
-- Tutor 106: Full week coverage, all shifts
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(106, '[1,3,5]', 'morning', '08:00', '10:00', 1),
(106, '[2,4]', 'morning', '09:00', '11:00', 1),
(106, '[1,3,5]', 'afternoon', '14:00', '16:00', 1),
(106, '[1,2,3,4,5]', 'evening', '19:00', '21:00', 1),
(106, '[6,0]', 'morning', '10:00', '12:00', 1);

-- Tutor 107: Weekday mornings and evenings
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(107, '[1,2,3,4,5]', 'morning', '07:00', '09:00', 1),
(107, '[2,4]', 'afternoon', '14:00', '16:00', 1),
(107, '[1,3,5]', 'evening', '18:00', '20:00', 1);

-- Tutor 108: Weekend specialist
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(108, '[6,0]', 'morning', '08:00', '12:00', 1),
(108, '[6,0]', 'afternoon', '14:00', '18:00', 1),
(108, '[6]', 'evening', '19:00', '21:00', 1);

-- Tutor 109: Afternoon specialist
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(109, '[1,2,3,4,5]', 'afternoon', '13:00', '15:00', 1),
(109, '[1,2,3,4,5]', 'afternoon', '15:00', '17:00', 1),
(109, '[6]', 'afternoon', '14:00', '16:00', 1);

-- Tutor 110: Evening specialist
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(110, '[1,3,5]', 'evening', '18:00', '20:00', 1),
(110, '[2,4]', 'evening', '19:00', '21:00', 1),
(110, '[6,0]', 'evening', '17:00', '19:00', 1);

-- Tutor 111: Full availability
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(111, '[1,2,3,4,5,6,0]', 'morning', '08:00', '10:00', 1),
(111, '[1,2,3,4,5,6,0]', 'afternoon', '14:00', '16:00', 1),
(111, '[1,2,3,4,5]', 'evening', '19:00', '21:00', 1);

-- Tutor 112: Early bird
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(112, '[1,2,3,4,5]', 'morning', '06:00', '08:00', 1),
(112, '[1,2,3,4,5]', 'morning', '08:00', '10:00', 1),
(112, '[6]', 'morning', '07:00', '09:00', 1);

-- Tutor 113: Night owl
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(113, '[1,3,5]', 'evening', '20:00', '22:00', 1),
(113, '[2,4]', 'evening', '21:00', '23:00', 1),
(113, '[0]', 'evening', '19:00', '21:00', 1);

-- Tutor 114: Flexible schedule
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(114, '[1,4]', 'morning', '09:00', '11:00', 1),
(114, '[2,5]', 'afternoon', '15:00', '17:00', 1),
(114, '[3,6]', 'evening', '18:00', '20:00', 1);

-- Tutor 115: Limited availability
INSERT INTO tutor_availability (tutor_id, recurring_days, shift_type, start_time, end_time, is_active) VALUES
(115, '[1,3]', 'afternoon', '14:00', '16:00', 1),
(115, '[5]', 'evening', '19:00', '21:00', 1);

SELECT '✓ 40+ availability slots seeded for 10 tutors' AS status;

-- Update existing bookings to reference the new availability records
UPDATE lesson_bookings b
JOIN tutor_availability a ON 
  a.tutor_id = 106 AND 
  JSON_CONTAINS(a.recurring_days, '1') AND 
  a.start_time = '08:00' AND 
  a.end_time = '10:00'
SET b.availability_id = a.id
WHERE b.id = 3;

UPDATE lesson_bookings b
JOIN tutor_availability a ON 
  a.tutor_id = 106 AND 
  JSON_CONTAINS(a.recurring_days, '1') AND 
  a.start_time = '19:00' AND 
  a.end_time = '21:00'
SET b.availability_id = a.id
WHERE b.id = 4;

UPDATE lesson_bookings b
JOIN tutor_availability a ON 
  a.tutor_id = 107 AND 
  JSON_CONTAINS(a.recurring_days, '2') AND 
  a.start_time = '14:00' AND 
  a.end_time = '16:00'
SET b.availability_id = a.id
WHERE b.id = 5;

SELECT '✓ Existing bookings remapped to new availability' AS status;

-- Add FK constraint (with IF NOT EXISTS check)
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = 'lophoc_online' 
  AND TABLE_NAME = 'lesson_bookings' 
  AND CONSTRAINT_NAME = 'fk_booking_availability' 
  AND CONSTRAINT_TYPE = 'FOREIGN KEY');

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE lesson_bookings ADD CONSTRAINT fk_booking_availability FOREIGN KEY (availability_id) REFERENCES tutor_availability(id) ON DELETE RESTRICT',
  'SELECT "FK already exists" AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ FK constraint ensured' AS status;

-- Create 5 realistic test bookings
INSERT INTO lesson_bookings (student_id, tutor_id, availability_id, lesson_date, start_time, end_time, status, price, notes, created_at) 
SELECT 
  33 as student_id,
  a.tutor_id,
  a.id as availability_id,
  DATE_ADD(CURDATE(), INTERVAL 7 DAY) as lesson_date,
  a.start_time,
  a.end_time,
  'confirmed' as status,
  150000 as price,
  'Test booking - Mathematics' as notes,
  NOW() as created_at
FROM tutor_availability a
WHERE a.tutor_id = 108 AND a.shift_type = 'morning' AND a.recurring_days = '[6,0]'
LIMIT 1;

INSERT INTO lesson_bookings (student_id, tutor_id, availability_id, lesson_date, start_time, end_time, status, price, notes, created_at)
SELECT 
  34 as student_id,
  a.tutor_id,
  a.id as availability_id,
  DATE_ADD(CURDATE(), INTERVAL 3 DAY) as lesson_date,
  a.start_time,
  a.end_time,
  'pending' as status,
  200000 as price,
  'Test booking - Physics' as notes,
  NOW() as created_at
FROM tutor_availability a
WHERE a.tutor_id = 109 AND a.shift_type = 'afternoon' AND a.start_time = '13:00'
LIMIT 1;

INSERT INTO lesson_bookings (student_id, tutor_id, availability_id, lesson_date, start_time, end_time, status, price, notes, created_at)
SELECT 
  35 as student_id,
  a.tutor_id,
  a.id as availability_id,
  DATE_ADD(CURDATE(), INTERVAL 5 DAY) as lesson_date,
  a.start_time,
  a.end_time,
  'confirmed' as status,
  180000 as price,
  'Test booking - Chemistry' as notes,
  NOW() as created_at
FROM tutor_availability a
WHERE a.tutor_id = 110 AND a.shift_type = 'evening' AND a.recurring_days = '[1,3,5]'
LIMIT 1;

SELECT '✓ New test bookings created' AS status;

-- Verification queries
SELECT 
  '=== FINAL SYSTEM STATE ===' AS info,
  (SELECT COUNT(*) FROM tutor_availability) as total_availability_slots,
  (SELECT COUNT(*) FROM lesson_bookings) as total_bookings,
  (SELECT COUNT(*) FROM lesson_bookings WHERE availability_id IS NOT NULL) as bookings_with_availability_id;

-- Show sample data
SELECT '=== SAMPLE AVAILABILITY (Tutor 106) ===' AS info;
SELECT id, tutor_id, recurring_days, shift_type, start_time, end_time, is_active
FROM tutor_availability
WHERE tutor_id = 106
ORDER BY shift_type, start_time;

SELECT '✓ Seed complete - System ready for testing!' AS status;
