-- Remove duplicate availability slots, keep only the oldest entry for each unique combination

USE lophoc_online;

-- Create a temporary table with the IDs to keep (MIN id for each unique combination)
CREATE TEMPORARY TABLE ids_to_keep AS
SELECT MIN(id) as id
FROM tutor_availability
GROUP BY tutor_id, day_of_week, shift_type, start_time, end_time;

-- Delete all records that are NOT in the ids_to_keep list
DELETE FROM tutor_availability 
WHERE id NOT IN (SELECT id FROM ids_to_keep);

-- Drop the temporary table
DROP TEMPORARY TABLE ids_to_keep;

-- Verify: show count by tutor
SELECT 
  tutor_id, 
  COUNT(*) as total_slots,
  COUNT(DISTINCT CONCAT(day_of_week, '-', shift_type, '-', start_time, '-', end_time)) as unique_slots
FROM tutor_availability 
WHERE is_active = 1
GROUP BY tutor_id
ORDER BY tutor_id;

-- Show sample data for tutor 107
SELECT tutor_id, day_of_week, shift_type, start_time, end_time, COUNT(*) as count
FROM tutor_availability 
WHERE tutor_id = 107 AND is_active = 1
GROUP BY tutor_id, day_of_week, shift_type, start_time, end_time
ORDER BY day_of_week, shift_type;
