-- ==========================================
-- DROP DEPRECATED LESSON_BOOKINGS TABLE
-- ==========================================
-- Date: 2025-11-01
-- Purpose: Remove unused lesson_bookings table from database
-- Reason: This table is not used in the application code
--
-- IMPORTANT: Backup database before running this script!
--
-- Usage:
--   mysql -u your_user -p your_database < drop-lesson-bookings.sql
-- ==========================================

-- Check if table exists and show record count
SELECT
    CONCAT('Table lesson_bookings exists with ', COUNT(*), ' records') as info
FROM lesson_bookings;

-- Create backup of lesson_bookings (just in case)
CREATE TABLE IF NOT EXISTS lesson_bookings_backup_20251101
SELECT * FROM lesson_bookings;

SELECT 'Backup created: lesson_bookings_backup_20251101' as status;

-- Drop the lesson_bookings table
DROP TABLE IF EXISTS lesson_bookings;

SELECT 'Table lesson_bookings has been dropped successfully' as status;

-- Verify table is gone
SHOW TABLES LIKE 'lesson_bookings';

-- Show remaining booking-related tables
SELECT 'Remaining booking tables:' as info;
SHOW TABLES LIKE '%booking%';
