-- =====================================================
-- MIGRATION: Consolidate time_slots and teaching_sessions into tutor_availability
-- Giữ tutor_availability, xóa 2 bảng kia
-- Một dòng lưu nhiều ngày qua recurring_days JSON
-- =====================================================

-- Step 1: Backup existing data
DROP TABLE IF EXISTS tutor_availability_backup;
CREATE TABLE tutor_availability_backup AS SELECT * FROM tutor_availability;

DROP TABLE IF EXISTS time_slots_backup;
CREATE TABLE time_slots_backup AS SELECT * FROM time_slots;

DROP TABLE IF EXISTS teaching_sessions_backup;
CREATE TABLE teaching_sessions_backup AS SELECT * FROM teaching_sessions;

SELECT '✅ Step 1: Backup completed' as status;

-- Step 2: Add recurring_days column to tutor_availability
ALTER TABLE tutor_availability 
  ADD COLUMN recurring_days VARCHAR(100) NULL COMMENT 'JSON array of days [1,3,5] = T2,T4,T6',
  MODIFY COLUMN day_of_week INT NULL COMMENT 'Single day (backward compat) or NULL if using recurring_days';

SELECT '✅ Step 2: Added recurring_days column' as status;

-- Step 3: Clear existing tutor_availability data (we'll repopulate from all sources)
DELETE FROM tutor_availability;

SELECT '✅ Step 3: Cleared tutor_availability' as status;

-- Step 4: Migrate from time_slots
-- Group by tutor_id, start_time, end_time, shift_type and aggregate days
INSERT INTO tutor_availability (tutor_id, recurring_days, start_time, end_time, shift_type, is_active, created_at, updated_at)
SELECT 
  tutor_id,
  CONCAT('[', GROUP_CONCAT(DISTINCT day_of_week ORDER BY day_of_week SEPARATOR ','), ']') as recurring_days,
  start_time,
  end_time,
  shift_type,
  1 as is_active,
  MIN(created_at) as created_at,
  NOW() as updated_at
FROM time_slots
WHERE is_available = 1
GROUP BY tutor_id, start_time, end_time, shift_type;

SELECT CONCAT('✅ Step 4: Migrated ', ROW_COUNT(), ' rows from time_slots') as status;

-- Step 5: Migrate from teaching_sessions (if has recurring_days format)
-- Only migrate rows with recurring_days that are NOT already in tutor_availability
INSERT INTO tutor_availability (tutor_id, recurring_days, start_time, end_time, shift_type, is_active, created_at, updated_at)
SELECT DISTINCT
  ts.tutor_id,
  ts.recurring_days,
  ts.start_time,
  ts.end_time,
  COALESCE(ts.session_type, 'morning') as shift_type,
  ts.is_active,
  ts.created_at,
  NOW() as updated_at
FROM teaching_sessions ts
WHERE ts.recurring_days IS NOT NULL
  AND ts.recurring_days != ''
  AND ts.is_active = 1
  AND NOT EXISTS (
    -- Check if same time slot already exists
    SELECT 1 FROM tutor_availability ta
    WHERE ta.tutor_id = ts.tutor_id
      AND ta.start_time = ts.start_time
      AND ta.end_time = ts.end_time
      AND ta.recurring_days = ts.recurring_days
  );

SELECT CONCAT('✅ Step 5: Migrated ', ROW_COUNT(), ' unique rows from teaching_sessions') as status;

-- Step 6: Verify data
SELECT 
  '📊 Data Summary' as section,
  (SELECT COUNT(*) FROM tutor_availability) as tutor_availability_count,
  (SELECT COUNT(*) FROM tutor_availability WHERE recurring_days IS NOT NULL) as with_recurring_days,
  (SELECT COUNT(*) FROM tutor_availability WHERE day_of_week IS NOT NULL) as with_single_day,
  (SELECT COUNT(DISTINCT tutor_id) FROM tutor_availability) as unique_tutors;

-- Show sample data
SELECT '📝 Sample migrated data:' as section;
SELECT 
  id,
  tutor_id,
  recurring_days,
  day_of_week,
  start_time,
  end_time,
  shift_type,
  is_active
FROM tutor_availability
ORDER BY tutor_id, start_time
LIMIT 10;

-- Step 7: Check for any tutors in old tables but missing in new table
SELECT '⚠️ Tutors in time_slots but missing in tutor_availability:' as check_name;
SELECT DISTINCT ts.tutor_id, COUNT(*) as slot_count
FROM time_slots ts
WHERE NOT EXISTS (
  SELECT 1 FROM tutor_availability ta WHERE ta.tutor_id = ts.tutor_id
)
GROUP BY ts.tutor_id;

SELECT '✅ Migration completed! Review data before dropping old tables.' as final_status;

-- =====================================================
-- MANUAL STEPS TO RUN AFTER VERIFICATION:
-- =====================================================
-- 
-- If everything looks good, run these commands to drop old tables:
-- 
-- DROP TABLE IF EXISTS time_slots;
-- DROP TABLE IF EXISTS teaching_sessions;
-- 
-- And optionally drop backup tables after some time:
-- DROP TABLE IF EXISTS tutor_availability_backup;
-- DROP TABLE IF EXISTS time_slots_backup;
-- DROP TABLE IF EXISTS teaching_sessions_backup;
-- =====================================================
