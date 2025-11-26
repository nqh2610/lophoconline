-- ================================================================
-- Script: Reset Video Call Sessions for Testing Prejoin & VideolifyFull_v2
-- Purpose: Tạo lại session test với thời gian hiện tại để test flow:
--          Dashboard → Click link học → Prejoin → Video Call
-- ================================================================

-- 1. XOÁ TẤT CẢ VIDEO CALL SESSIONS CŨ (test data)
DELETE FROM video_call_sessions WHERE roomName LIKE 'test-%';

-- 2. TẠO SESSION TEST CHO GIA SƯ VÀ HỌC VIÊN
-- Lấy thông tin gia sư và học viên để test
SET @tutorId = (SELECT id FROM tutors ORDER BY createdAt DESC LIMIT 1);
SET @studentId = (SELECT id FROM students ORDER BY createdAt DESC LIMIT 1);
SET @tutorUserId = (SELECT userId FROM tutors WHERE id = @tutorId);
SET @studentUserId = (SELECT userId FROM students WHERE id = @studentId);

-- Tạo buổi học thử nghiệm
INSERT INTO lessons (
    tutorId,
    studentId,
    subject,
    date,
    startTime,
    endTime,
    type,
    status,
    totalPrice,
    isTrial,
    createdAt,
    updatedAt
) VALUES (
    @tutorId,
    @studentId,
    'Test Video Call - Toán',
    CURDATE(), -- Hôm nay
    DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 5 MINUTE), '%H:%i:%s'), -- Bắt đầu sau 5 phút
    DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 65 MINUTE), '%H:%i:%s'), -- Kết thúc sau 65 phút
    'trial',
    'confirmed',
    0,
    1,
    NOW(),
    NOW()
);

SET @lessonId = LAST_INSERT_ID();

-- Tạo transaction thanh toán (đã thanh toán)
INSERT INTO transactions (
    userId,
    type,
    amount,
    status,
    method,
    lessonId,
    createdAt,
    updatedAt
) VALUES (
    @studentUserId,
    'lesson_payment',
    0,
    'completed',
    'free',
    @lessonId,
    NOW(),
    NOW()
);

-- Tạo video call session
INSERT INTO video_call_sessions (
    roomName,
    sessionType,
    lessonId,
    tutorId,
    studentId,
    accessToken,
    tutorToken,
    studentToken,
    scheduledStartTime,
    scheduledEndTime,
    status,
    paymentStatus,
    canTutorJoin,
    canStudentJoin,
    provider,
    expiresAt,
    createdAt,
    updatedAt
) VALUES (
    CONCAT('test-', UUID_SHORT()),
    'lesson',
    @lessonId,
    @tutorUserId,
    @studentUserId,
    CONCAT('access-', MD5(CONCAT(@lessonId, NOW()))),
    CONCAT('tutor-', MD5(CONCAT(@tutorUserId, NOW()))),
    CONCAT('student-', MD5(CONCAT(@studentUserId, NOW()))),
    DATE_ADD(NOW(), INTERVAL 5 MINUTE), -- Có thể join sau 5 phút
    DATE_ADD(NOW(), INTERVAL 65 MINUTE), -- Hết hạn sau 65 phút
    'scheduled',
    'paid',
    1, -- Gia sư có thể join
    1, -- Học viên có thể join
    'videolify',
    DATE_ADD(NOW(), INTERVAL 2 HOUR), -- Token hết hạn sau 2 giờ
    NOW(),
    NOW()
);

-- ================================================================
-- KẾT QUẢ
-- ================================================================
SELECT 
    'TEST SESSION CREATED' AS status,
    @lessonId AS lessonId,
    v.id AS sessionId,
    v.roomName,
    v.accessToken,
    v.scheduledStartTime,
    v.scheduledEndTime,
    CONCAT('Tutor: ', u1.name) AS tutor,
    CONCAT('Student: ', u2.name) AS student,
    'Session có thể join sau 5 phút từ bây giờ' AS note
FROM video_call_sessions v
JOIN users u1 ON v.tutorId = u1.id
JOIN users u2 ON v.studentId = u2.id
WHERE v.lessonId = @lessonId;

-- ================================================================
-- HƯỚNG DẪN TEST
-- ================================================================
-- 1. Chạy script này để tạo session
-- 2. Đăng nhập với tài khoản GIA SƯ:
--    - Vào /tutor/dashboard
--    - Xem card "Lịch học trực tuyến"
--    - Click nút "Tham gia" → Mở prejoin page
--    - Cài đặt camera/mic/nền ảo
--    - Click "Tham gia ngay" → Vào VideolifyFull_v2
--
-- 3. Mở trình duyệt khác, đăng nhập với tài khoản HỌC VIÊN:
--    - Vào /student/dashboard
--    - Xem card "Lịch học trực tuyến"
--    - Click nút "Tham gia" → Mở prejoin page
--    - Cài đặt camera/mic/nền ảo
--    - Click "Tham gia ngay" → Vào VideolifyFull_v2
--
-- 4. Test các tính năng:
--    - Prejoin: Camera/mic toggle, virtual background
--    - Video call: Chat, whiteboard, screen share, file transfer
-- ================================================================
