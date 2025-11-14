-- ============================================================================
-- Migration: Fix trial booking constraint to allow multiple regular bookings
-- Date: 2025-10-29
-- Purpose: Change is_trial from 0/1 to NULL/1 for proper UNIQUE constraint
-- ============================================================================

START TRANSACTION;

-- Step 1: Drop existing incorrect UNIQUE constraint
ALTER TABLE bookings DROP INDEX idx_unique_trial_per_tutor;

-- Step 2: Modify is_trial column to allow NULL
-- Change: 0 = regular booking → NULL
--         1 = trial booking → 1
ALTER TABLE bookings MODIFY COLUMN is_trial TINYINT DEFAULT NULL;

-- Step 3: Update existing data
-- Convert all regular bookings (is_trial = 0) to NULL
UPDATE bookings SET is_trial = NULL WHERE is_trial = 0;

-- Step 4: Create new UNIQUE constraint
-- This allows multiple (student_id, tutor_id, NULL) for regular bookings
-- But only ONE (student_id, tutor_id, 1) for trial booking per tutor
CREATE UNIQUE INDEX idx_unique_trial_per_tutor 
ON bookings (student_id, tutor_id, is_trial);

-- Verification queries
SELECT 'Migration completed successfully' as status;

SELECT 
  COUNT(*) as total_bookings,
  SUM(CASE WHEN is_trial = 1 THEN 1 ELSE 0 END) as trial_bookings,
  SUM(CASE WHEN is_trial IS NULL THEN 1 ELSE 0 END) as regular_bookings
FROM bookings;

COMMIT;
