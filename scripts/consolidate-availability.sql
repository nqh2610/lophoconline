-- Consolidate tutor_availability rows: merge multiple single-day rows into one multi-day row
-- Example: [1], [3], [5] at same time → [1,3,5] in ONE row

-- Create temp table to store consolidated data
CREATE TEMPORARY TABLE temp_consolidated AS
SELECT 
    tutor_id,
    shift_type,
    start_time,
    end_time,
    -- Merge all days: extract numbers from JSON arrays and combine
    CONCAT('[', 
        GROUP_CONCAT(
            DISTINCT REPLACE(REPLACE(recurring_days, '[', ''), ']', '') 
            ORDER BY CAST(REPLACE(REPLACE(recurring_days, '[', ''), ']', '') AS UNSIGNED)
            SEPARATOR ','
        ),
    ']') as merged_recurring_days,
    MAX(is_active) as is_active,
    MIN(created_at) as created_at,
    MAX(updated_at) as updated_at,
    MIN(id) as keep_id  -- Keep the first ID
FROM tutor_availability
WHERE is_active = 1
GROUP BY tutor_id, shift_type, start_time, end_time;

-- Show what will be consolidated
SELECT 
    'BEFORE' as status,
    COUNT(*) as total_rows,
    COUNT(DISTINCT CONCAT(tutor_id, '-', start_time, '-', end_time)) as unique_time_slots
FROM tutor_availability
WHERE is_active = 1

UNION ALL

SELECT 
    'AFTER' as status,
    COUNT(*) as total_rows,
    COUNT(DISTINCT CONCAT(tutor_id, '-', start_time, '-', end_time)) as unique_time_slots
FROM temp_consolidated;

-- Sample of consolidated data
SELECT * FROM temp_consolidated LIMIT 10;

-- Delete old fragmented rows (keep only one row per time slot)
DELETE FROM tutor_availability
WHERE is_active = 1
  AND id NOT IN (
    SELECT keep_id FROM temp_consolidated
  );

-- Update the kept rows with merged recurring_days
UPDATE tutor_availability ta
JOIN temp_consolidated tc ON ta.id = tc.keep_id
SET ta.recurring_days = tc.merged_recurring_days,
    ta.day_of_week = NULL;  -- Clear single day field since we're using recurring_days now

-- Verify consolidation
SELECT 
    id,
    tutor_id,
    recurring_days,
    shift_type,
    start_time,
    end_time,
    LENGTH(recurring_days) - LENGTH(REPLACE(recurring_days, ',', '')) + 1 as num_days
FROM tutor_availability
WHERE is_active = 1
ORDER BY tutor_id, start_time
LIMIT 15;

-- Show statistics
SELECT 
    tutor_id,
    COUNT(*) as num_time_slots,
    SUM(LENGTH(recurring_days) - LENGTH(REPLACE(recurring_days, ',', '')) + 1) as total_day_slots
FROM tutor_availability
WHERE is_active = 1
GROUP BY tutor_id
ORDER BY tutor_id
LIMIT 10;
