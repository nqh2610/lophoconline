-- =====================================================
-- IMPROVE TEACHING SESSIONS
-- Đảm bảo CSDL phù hợp với yêu cầu mới
-- =====================================================

-- 1. Đảm bảo tutors có hourly_rate (đã có rồi)
-- hourly_rate INT NOT NULL (VND per hour)

-- 2. Đảm bảo teaching_sessions có các trường cần thiết
-- recurring_days: JSON array [1,2,3,4,5,6,0] (0=CN)
-- start_time: VARCHAR(10) "HH:MM"
-- end_time: VARCHAR(10) "HH:MM"
-- session_type: VARCHAR(20) "morning/afternoon/evening" (optional)

-- Thêm cột session_type nếu chưa có
ALTER TABLE teaching_sessions 
ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) NULL
COMMENT 'morning/afternoon/evening';

-- 3. Tạo index để tăng hiệu năng truy vấn
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_tutor_time 
ON teaching_sessions(tutor_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_teaching_sessions_active 
ON teaching_sessions(tutor_id, is_active, status);

-- 4. Kiểm tra dữ liệu
SELECT 'Teaching Sessions Count:' as info, COUNT(*) as count FROM teaching_sessions;
SELECT 'Tutors with hourly_rate:' as info, COUNT(*) as count FROM tutors WHERE hourly_rate > 0;

-- 5. Hiển thị cấu trúc bảng
DESCRIBE teaching_sessions;
DESCRIBE tutors;
