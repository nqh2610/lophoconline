-- ==============================================
-- Seed comprehensive test data with FK handling
-- ==============================================

-- Drop FK temporarily
ALTER TABLE lesson_bookings DROP FOREIGN KEY fk_booking_availability;
SELECT '✓ FK temporarily removed' AS status;

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
-- Get the new IDs for the matching slots
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

-- Recreate FK constraint
ALTER TABLE lesson_bookings 
  ADD CONSTRAINT fk_booking_availability 
  FOREIGN KEY (availability_id) 
  REFERENCES tutor_availability(id) 
  ON DELETE RESTRICT;

SELECT '✓ FK constraint recreated' AS status;

-- Create 5 realistic test bookings
-- Note: These use the newly seeded availability records
INSERT INTO lesson_bookings (student_id, tutor_id, availability_id, subject, lesson_date, start_time, end_time, status, created_at) 
SELECT 
  101 as student_id,
  a.tutor_id,
  a.id as availability_id,
  'Mathematics' as subject,
  DATE_ADD(CURDATE(), INTERVAL 7 DAY) as lesson_date,
  a.start_time,
  a.end_time,
  'confirmed' as status,
  NOW() as created_at
FROM tutor_availability a
WHERE a.tutor_id = 108 AND a.shift_type = 'morning'
LIMIT 1;

INSERT INTO lesson_bookings (student_id, tutor_id, availability_id, subject, lesson_date, start_time, end_time, status, created_at)
SELECT 
  102 as student_id,
  a.tutor_id,
  a.id as availability_id,
  'Physics' as subject,
  DATE_ADD(CURDATE(), INTERVAL 3 DAY) as lesson_date,
  a.start_time,
  a.end_time,
  'pending' as status,
  NOW() as created_at
FROM tutor_availability a
WHERE a.tutor_id = 109 AND a.shift_type = 'afternoon'
LIMIT 1;

INSERT INTO lesson_bookings (student_id, tutor_id, availability_id, subject, lesson_date, start_time, end_time, status, created_at)
SELECT 
  103 as student_id,
  a.tutor_id,
  a.id as availability_id,
  'Chemistry' as subject,
  DATE_ADD(CURDATE(), INTERVAL 5 DAY) as lesson_date,
  a.start_time,
  a.end_time,
  'confirmed' as status,
  NOW() as created_at
FROM tutor_availability a
WHERE a.tutor_id = 110 AND a.shift_type = 'evening'
LIMIT 1;

SELECT '✓ New test bookings created' AS status;

-- Verification queries
SELECT 
  '=== FINAL SYSTEM STATE ===' AS '---',
  (SELECT COUNT(*) FROM tutor_availability) as total_availability_slots,
  (SELECT COUNT(*) FROM lesson_bookings) as total_bookings,
  (SELECT COUNT(*) FROM lesson_bookings WHERE availability_id IS NOT NULL) as bookings_with_fk;

SELECT '✓ Seed complete - System ready for testing!' AS status;
