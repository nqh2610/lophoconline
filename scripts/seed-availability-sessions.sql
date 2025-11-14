-- ========================================
-- SEED DATA: Tutor Availability & Teaching Sessions
-- ========================================

USE lophoc_online;

-- ========================================
-- 1. SEED tutor_availability (Thời gian rảnh)
-- ========================================

-- Gia sư ID 106 (Nguyễn Thị Mai - 200k/h)
INSERT INTO tutor_availability (tutor_id, day_of_week, shift_type, start_time, end_time, is_active) VALUES
(106, 1, 'morning', '06:00', '12:00', 1),    -- Thứ 2 sáng
(106, 1, 'evening', '18:00', '22:00', 1),    -- Thứ 2 tối
(106, 3, 'afternoon', '12:00', '18:00', 1),  -- Thứ 4 chiều
(106, 5, 'morning', '06:00', '12:00', 1),    -- Thứ 6 sáng
(106, 0, 'afternoon', '12:00', '18:00', 1);  -- Chủ nhật chiều

-- Gia sư ID 107 (Trần Văn Hùng - 250k/h)
INSERT INTO tutor_availability (tutor_id, day_of_week, shift_type, start_time, end_time, is_active) VALUES
(107, 2, 'morning', '06:00', '12:00', 1),    -- Thứ 3 sáng
(107, 2, 'afternoon', '12:00', '18:00', 1),  -- Thứ 3 chiều
(107, 4, 'evening', '18:00', '22:00', 1),    -- Thứ 5 tối
(107, 6, 'morning', '06:00', '12:00', 1),    -- Thứ 7 sáng
(107, 6, 'afternoon', '12:00', '18:00', 1);  -- Thứ 7 chiều

-- Gia sư ID 108 (Lê Minh Tú - 120k/h)
INSERT INTO tutor_availability (tutor_id, day_of_week, shift_type, start_time, end_time, is_active) VALUES
(108, 1, 'afternoon', '12:00', '18:00', 1),  -- Thứ 2 chiều
(108, 3, 'evening', '18:00', '22:00', 1),    -- Thứ 4 tối
(108, 5, 'afternoon', '12:00', '18:00', 1),  -- Thứ 6 chiều
(108, 5, 'evening', '18:00', '22:00', 1);    -- Thứ 6 tối

-- ========================================
-- 2. SEED teaching_sessions (Ca dạy)
-- ========================================

-- Get availability_id từ INSERT trên
SET @avail_106_1 = (SELECT id FROM tutor_availability WHERE tutor_id=106 AND day_of_week=1 AND shift_type='morning' LIMIT 1);
SET @avail_106_2 = (SELECT id FROM tutor_availability WHERE tutor_id=106 AND day_of_week=1 AND shift_type='evening' LIMIT 1);
SET @avail_106_3 = (SELECT id FROM tutor_availability WHERE tutor_id=106 AND day_of_week=3 LIMIT 1);
SET @avail_106_4 = (SELECT id FROM tutor_availability WHERE tutor_id=106 AND day_of_week=5 LIMIT 1);

SET @avail_107_1 = (SELECT id FROM tutor_availability WHERE tutor_id=107 AND day_of_week=2 AND shift_type='morning' LIMIT 1);
SET @avail_107_2 = (SELECT id FROM tutor_availability WHERE tutor_id=107 AND day_of_week=2 AND shift_type='afternoon' LIMIT 1);
SET @avail_107_3 = (SELECT id FROM tutor_availability WHERE tutor_id=107 AND day_of_week=4 LIMIT 1);
SET @avail_107_4 = (SELECT id FROM tutor_availability WHERE tutor_id=107 AND day_of_week=6 LIMIT 1);

SET @avail_108_1 = (SELECT id FROM tutor_availability WHERE tutor_id=108 AND day_of_week=1 LIMIT 1);
SET @avail_108_2 = (SELECT id FROM tutor_availability WHERE tutor_id=108 AND day_of_week=3 LIMIT 1);
SET @avail_108_3 = (SELECT id FROM tutor_availability WHERE tutor_id=108 AND day_of_week=5 AND shift_type='afternoon' LIMIT 1);

-- Gia sư ID 106 - Ca dạy (hourly_rate 200k/h)
INSERT INTO teaching_sessions 
(tutor_id, availability_id, subject_id, grade_level_id, day_of_week, start_time, end_time, duration_hours, price_per_session, max_students, title, description, start_date, status, is_active)
VALUES
-- Toán 10 - Thứ 2 sáng (2h = 400k)
(106, @avail_106_1, 5, 10, 1, '08:00', '10:00', 2.0, 400000, 1, 'Toán 10 - Ôn thi giữa kỳ', 'Hệ thống kiến thức hàm số, bất phương trình', '2025-10-27', 'open', 1),
-- Toán 11 - Thứ 2 sáng (1.5h = 300k)
(106, @avail_106_1, 5, 11, 1, '10:00', '11:30', 1.5, 300000, 1, 'Toán 11 - Lượng giác', 'Công thức lượng giác cơ bản và nâng cao', '2025-10-27', 'open', 1),
-- Lý 10 - Thứ 2 tối (2h = 400k)
(106, @avail_106_2, 8, 10, 1, '19:00', '21:00', 2.0, 400000, 2, 'Vật lý 10 - Lớp nhóm', 'Động học chất điểm, Động lực học', '2025-10-27', 'open', 1),
-- Toán 12 - Thứ 4 chiều (2h = 400k)
(106, @avail_106_3, 5, 12, 3, '14:00', '16:00', 2.0, 400000, 1, 'Toán 12 - Luyện thi THPT', 'Giải tích, Hình học không gian', '2025-10-29', 'open', 1),
-- Lý 11 - Thứ 6 sáng (1.5h = 300k)
(106, @avail_106_4, 8, 11, 5, '08:00', '09:30', 1.5, 300000, 1, 'Vật lý 11 - Điện học', 'Điện trường, Dòng điện không đổi', '2025-10-31', 'open', 1);

-- Gia sư ID 107 - Ca dạy (hourly_rate 250k/h)
INSERT INTO teaching_sessions 
(tutor_id, availability_id, subject_id, grade_level_id, day_of_week, start_time, end_time, duration_hours, price_per_session, max_students, title, description, start_date, status, is_active)
VALUES
-- Tiếng Anh 9 - Thứ 3 sáng (2h = 500k)
(107, @avail_107_1, 3, 9, 2, '08:00', '10:00', 2.0, 500000, 1, 'Tiếng Anh 9 - Grammar & Reading', 'Ngữ pháp nâng cao, Đọc hiểu', '2025-10-28', 'open', 1),
-- IELTS - Thứ 3 chiều (2h = 500k)
(107, @avail_107_2, 3, 28, 2, '14:00', '16:00', 2.0, 500000, 1, 'IELTS 6.0 - Speaking & Writing', 'Luyện thi IELTS Speaking band 6.0+', '2025-10-28', 'open', 1),
-- Văn 10 - Thứ 5 tối (1.5h = 375k)
(107, @avail_107_3, 2, 10, 4, '19:00', '20:30', 1.5, 375000, 1, 'Ngữ Văn 10 - Nghị luận xã hội', 'Kỹ năng viết bài nghị luận', '2025-10-30', 'open', 1),
-- Tiếng Anh 12 - Thứ 7 sáng (2h = 500k)
(107, @avail_107_4, 3, 12, 6, '08:00', '10:00', 2.0, 500000, 2, 'Tiếng Anh 12 - Luyện thi THPT', 'Grammar, Reading, Writing cho kỳ thi THPT', '2025-11-01', 'open', 1);

-- Gia sư ID 108 - Ca dạy (hourly_rate 120k/h)
INSERT INTO teaching_sessions 
(tutor_id, availability_id, subject_id, grade_level_id, day_of_week, start_time, end_time, duration_hours, price_per_session, max_students, title, description, start_date, status, is_active)
VALUES
-- Hóa 10 - Thứ 2 chiều (2h = 240k)
(108, @avail_108_1, 7, 10, 1, '14:00', '16:00', 2.0, 240000, 1, 'Hóa học 10 - Nguyên tử, Bảng tuần hoàn', 'Cấu trúc nguyên tử, Định luật tuần hoàn', '2025-10-27', 'open', 1),
-- Sinh 11 - Thứ 4 tối (1.5h = 180k)
(108, @avail_108_2, 6, 11, 3, '19:00', '20:30', 1.5, 180000, 1, 'Sinh học 11 - Di truyền học', 'ADN, ARN, Nhiễm sắc thể', '2025-10-29', 'open', 1),
-- Hóa 12 - Thứ 6 chiều (2h = 240k)
(108, @avail_108_3, 7, 12, 5, '14:00', '16:00', 2.0, 240000, 1, 'Hóa học 12 - Hữu cơ', 'Hidrocacbon, Dẫn xuất Halogen', '2025-10-31', 'open', 1),
-- Sinh 12 - Thứ 6 tối (1.5h = 180k)
(108, @avail_108_3, 6, 12, 5, '19:00', '20:30', 1.5, 180000, 2, 'Sinh học 12 - Luyện thi THPT', 'Ôn tập toàn bộ chương trình Sinh 12', '2025-10-31', 'open', 1);

-- ========================================
-- 3. SEED lesson_bookings (Ví dụ đăng ký)
-- ========================================

-- Lấy session IDs
SET @session_toan10_106 = (SELECT id FROM teaching_sessions WHERE tutor_id=106 AND title LIKE 'Toán 10%' LIMIT 1);
SET @session_ly10_106 = (SELECT id FROM teaching_sessions WHERE tutor_id=106 AND title LIKE 'Vật lý 10%' LIMIT 1);
SET @session_ielts_107 = (SELECT id FROM teaching_sessions WHERE tutor_id=107 AND title LIKE 'IELTS%' LIMIT 1);

-- Học sinh 174 đăng ký 2 buổi với gia sư 106
INSERT INTO lesson_bookings 
(teaching_session_id, tutor_id, student_id, lesson_date, start_time, end_time, price, payment_status, status, tutor_confirmed, meeting_link)
VALUES
-- Toán 10 ngày 28/10 (Thứ 2)
(@session_toan10_106, 106, 174, '2025-10-28', '08:00', '10:00', 400000, 'paid', 'confirmed', 1, 'https://meet.google.com/abc-defg-hij'),
-- Lý 10 lớp nhóm ngày 28/10
(@session_ly10_106, 106, 174, '2025-10-28', '19:00', '21:00', 400000, 'paid', 'confirmed', 1, 'https://meet.google.com/xyz-uvwx-rst');

-- Học sinh 186 đăng ký IELTS với gia sư 107
INSERT INTO lesson_bookings 
(teaching_session_id, tutor_id, student_id, lesson_date, start_time, end_time, price, payment_status, status)
VALUES
-- IELTS ngày 29/10 (Thứ 3)
(@session_ielts_107, 107, 186, '2025-10-29', '14:00', '16:00', 500000, 'pending', 'pending');

-- Update current_students
UPDATE teaching_sessions SET current_students = 1 WHERE id IN (@session_toan10_106, @session_ielts_107);
UPDATE teaching_sessions SET current_students = 1 WHERE id = @session_ly10_106;  -- Lớp nhóm có 1 học sinh

-- ========================================
-- 4. SEED availability_exceptions (Ví dụ)
-- ========================================

-- Gia sư 106 nghỉ ngày 1/11
INSERT INTO availability_exceptions 
(tutor_id, exception_date, exception_type, start_time, end_time, reason)
VALUES
(106, '2025-11-01', 'blocked', '08:00', '12:00', 'Đi công tác');

-- Gia sư 107 thêm giờ ngày 2/11
INSERT INTO availability_exceptions 
(tutor_id, exception_date, exception_type, start_time, end_time, reason)
VALUES
(107, '2025-11-02', 'available', '19:00', '22:00', 'Thêm giờ dạy đặc biệt');

-- ========================================
-- DONE! ✅
-- ========================================

-- Verify data
SELECT 'Tutor Availability Count:' as info, COUNT(*) as count FROM tutor_availability
UNION ALL
SELECT 'Teaching Sessions Count:', COUNT(*) FROM teaching_sessions
UNION ALL
SELECT 'Lesson Bookings Count:', COUNT(*) FROM lesson_bookings
UNION ALL
SELECT 'Availability Exceptions Count:', COUNT(*) FROM availability_exceptions;
