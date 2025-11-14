-- Migration: Add Approval Workflow to Tutors Table
-- Date: 2025-10-25
-- Purpose: Implement approval system - tutors need admin approval before going live

-- Step 1: Add new columns for approval workflow
ALTER TABLE tutors 
ADD COLUMN approval_status VARCHAR(50) DEFAULT 'pending' 
  COMMENT 'Approval status: pending, approved, rejected';

ALTER TABLE tutors 
ADD COLUMN approved_by INT 
  COMMENT 'Admin user ID who approved/rejected this tutor';

ALTER TABLE tutors 
ADD COLUMN approved_at TIMESTAMP NULL 
  COMMENT 'Timestamp when tutor was approved/rejected';

ALTER TABLE tutors 
ADD COLUMN rejection_reason TEXT 
  COMMENT 'Reason for rejection (if rejected)';

-- Step 2: Update existing tutors
-- IMPORTANT: Review existing tutors first before running this
-- Option A: Set all existing tutors to 'approved' (if you trust current data)
UPDATE tutors 
SET approval_status = 'approved', 
    approved_at = created_at,
    is_active = 1
WHERE is_active = 1;

-- Option B: Set all to 'pending' for manual review
-- UPDATE tutors 
-- SET approval_status = 'pending', 
--     is_active = 0;

-- Step 3: Modify is_active default for NEW tutors (schema.ts already updated)
-- New tutors will have is_active = 0 by default (controlled in schema.ts)

-- Step 4: Add index for faster queries
CREATE INDEX idx_tutors_approval_status ON tutors(approval_status);
CREATE INDEX idx_tutors_is_active ON tutors(is_active);

-- Step 5: Verify changes
SELECT 
  COUNT(*) as total_tutors,
  SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
FROM tutors;

-- Show sample of updated data
SELECT id, full_name, approval_status, is_active, approved_at, created_at 
FROM tutors 
LIMIT 10;
