-- Add phone field to tutors table
USE lophoc_db;

ALTER TABLE tutors 
ADD COLUMN phone VARCHAR(20) AFTER full_name;
