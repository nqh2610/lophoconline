-- ============================================================================
-- Migration: Add availability_id to bookings table
-- Date: 2025-10-30
-- Purpose: Link bookings to specific tutor availability slots
-- ============================================================================

START TRANSACTION;

-- Step 1: Add availability_id column (allow NULL temporarily for migration)
ALTER TABLE bookings 
ADD COLUMN availability_id BIGINT UNSIGNED NULL AFTER student_id;

-- Step 2: Add index for performance
ALTER TABLE bookings
ADD INDEX idx_bookings_availability (availability_id);

-- Step 3: Add foreign key constraint
ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_availability_id 
FOREIGN KEY (availability_id) 
REFERENCES tutor_availability(id) 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- Step 4: Make availability_id NOT NULL (after data migration if needed)
-- Note: Currently no data, so we can make it NOT NULL immediately
-- If there's existing data, you need to populate availability_id first
-- ALTER TABLE bookings MODIFY COLUMN availability_id BIGINT UNSIGNED NOT NULL;

-- Verification
SELECT 'Migration completed successfully' as status;

SHOW CREATE TABLE bookings\G

COMMIT;
