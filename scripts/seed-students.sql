-- ========================================
-- SEED students table (based on existing users)
-- ========================================

USE lophoc_online;

-- Create student profiles for existing users with role='student'
-- userId: 174 (username: student)
INSERT INTO students (user_id, full_name, phone, grade_level_id) VALUES
(174, 'Học sinh Test', '0901234567', 180);  -- Lớp 10

-- userId: 186 (username: giasutest) 
INSERT INTO students (user_id, full_name, phone, grade_level_id) VALUES
(186, 'Nguyễn Quang Hùng', '0902345678', 182);  -- Lớp 12

-- userId: 187 (username: hung)
INSERT INTO students (user_id, full_name, phone, grade_level_id) VALUES
(187, 'Trần Văn Hùng', '0903456789', 181);  -- Lớp 11

-- Verify
SELECT s.id, s.user_id, s.full_name, u.username, gl.name as grade
FROM students s
JOIN users u ON u.id = s.user_id
LEFT JOIN grade_levels gl ON gl.id = s.grade_level_id;
