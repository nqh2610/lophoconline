-- ================================================================
-- Script: Tạo nhiều session test với thời gian khác nhau
-- ================================================================

-- Xóa session test cũ
DELETE FROM video_call_sessions WHERE roomName LIKE 'test-%';
DELETE FROM transactions WHERE lessonId IN (SELECT id FROM lessons WHERE subject LIKE 'Test Video Call%');
DELETE FROM lessons WHERE subject LIKE 'Test Video Call%';

-- Lấy tutor và student
SET @tutorId = (SELECT id FROM tutors ORDER BY createdAt DESC LIMIT 1);
SET @studentId = (SELECT id FROM students ORDER BY createdAt DESC LIMIT 1);
SET @tutorUserId = (SELECT userId FROM tutors WHERE id = @tutorId);
SET @studentUserId = (SELECT userId FROM students WHERE id = @studentId);

-- ================================================================
-- SESSION 1: Có thể join NGAY (đang diễn ra)
-- ================================================================
INSERT INTO lessons (tutorId, studentId, subject, date, startTime, endTime, type, status, totalPrice, isTrial, createdAt, updatedAt)
VALUES (
    @tutorId, @studentId, 'Test Video Call - Live Now',
    CURDATE(),
    DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 5 MINUTE), '%H:%i:%s'),
    DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 55 MINUTE), '%H:%i:%s'),
    'trial', 'confirmed', 0, 1, NOW(), NOW()
);
SET @lesson1 = LAST_INSERT_ID();

INSERT INTO transactions (userId, type, amount, status, method, lessonId, createdAt, updatedAt)
VALUES (@studentUserId, 'lesson_payment', 0, 'completed', 'free', @lesson1, NOW(), NOW());

INSERT INTO video_call_sessions (
    roomName, sessionType, lessonId, tutorId, studentId,
    accessToken, tutorToken, studentToken,
    scheduledStartTime, scheduledEndTime,
    status, paymentStatus, canTutorJoin, canStudentJoin,
    provider, expiresAt, createdAt, updatedAt
) VALUES (
    CONCAT('test-live-', UUID_SHORT()), 'lesson', @lesson1, @tutorUserId, @studentUserId,
    CONCAT('access-', MD5(CONCAT(@lesson1, NOW()))),
    CONCAT('tutor-', MD5(CONCAT(@tutorUserId, NOW(), '1'))),
    CONCAT('student-', MD5(CONCAT(@studentUserId, NOW(), '1'))),
    DATE_SUB(NOW(), INTERVAL 5 MINUTE),
    DATE_ADD(NOW(), INTERVAL 55 MINUTE),
    'scheduled', 'paid', 1, 1, 'videolify',
    DATE_ADD(NOW(), INTERVAL 2 HOUR), NOW(), NOW()
);

-- ================================================================
-- SESSION 2: Join sau 10 phút
-- ================================================================
INSERT INTO lessons (tutorId, studentId, subject, date, startTime, endTime, type, status, totalPrice, isTrial, createdAt, updatedAt)
VALUES (
    @tutorId, @studentId, 'Test Video Call - In 10 min',
    CURDATE(),
    DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 10 MINUTE), '%H:%i:%s'),
    DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 70 MINUTE), '%H:%i:%s'),
    'regular', 'confirmed', 100000, 0, NOW(), NOW()
);
SET @lesson2 = LAST_INSERT_ID();

INSERT INTO transactions (userId, type, amount, status, method, lessonId, createdAt, updatedAt)
VALUES (@studentUserId, 'lesson_payment', 100000, 'completed', 'bank_transfer', @lesson2, NOW(), NOW());

INSERT INTO video_call_sessions (
    roomName, sessionType, lessonId, tutorId, studentId,
    accessToken, tutorToken, studentToken,
    scheduledStartTime, scheduledEndTime,
    status, paymentStatus, canTutorJoin, canStudentJoin,
    provider, expiresAt, createdAt, updatedAt
) VALUES (
    CONCAT('test-10min-', UUID_SHORT()), 'lesson', @lesson2, @tutorUserId, @studentUserId,
    CONCAT('access-', MD5(CONCAT(@lesson2, NOW()))),
    CONCAT('tutor-', MD5(CONCAT(@tutorUserId, NOW(), '2'))),
    CONCAT('student-', MD5(CONCAT(@studentUserId, NOW(), '2'))),
    DATE_ADD(NOW(), INTERVAL 10 MINUTE),
    DATE_ADD(NOW(), INTERVAL 70 MINUTE),
    'scheduled', 'paid', 1, 1, 'videolify',
    DATE_ADD(NOW(), INTERVAL 3 HOUR), NOW(), NOW()
);

-- ================================================================
-- SESSION 3: Join sau 1 giờ
-- ================================================================
INSERT INTO lessons (tutorId, studentId, subject, date, startTime, endTime, type, status, totalPrice, isTrial, createdAt, updatedAt)
VALUES (
    @tutorId, @studentId, 'Test Video Call - In 1 hour',
    CURDATE(),
    DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 HOUR), '%H:%i:%s'),
    DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 2 HOUR), '%H:%i:%s'),
    'regular', 'confirmed', 150000, 0, NOW(), NOW()
);
SET @lesson3 = LAST_INSERT_ID();

INSERT INTO transactions (userId, type, amount, status, method, lessonId, createdAt, updatedAt)
VALUES (@studentUserId, 'lesson_payment', 150000, 'completed', 'bank_transfer', @lesson3, NOW(), NOW());

INSERT INTO video_call_sessions (
    roomName, sessionType, lessonId, tutorId, studentId,
    accessToken, tutorToken, studentToken,
    scheduledStartTime, scheduledEndTime,
    status, paymentStatus, canTutorJoin, canStudentJoin,
    provider, expiresAt, createdAt, updatedAt
) VALUES (
    CONCAT('test-1hour-', UUID_SHORT()), 'lesson', @lesson3, @tutorUserId, @studentUserId,
    CONCAT('access-', MD5(CONCAT(@lesson3, NOW()))),
    CONCAT('tutor-', MD5(CONCAT(@tutorUserId, NOW(), '3'))),
    CONCAT('student-', MD5(CONCAT(@studentUserId, NOW(), '3'))),
    DATE_ADD(NOW(), INTERVAL 1 HOUR),
    DATE_ADD(NOW(), INTERVAL 2 HOUR),
    'scheduled', 'paid', 1, 1, 'videolify',
    DATE_ADD(NOW(), INTERVAL 4 HOUR), NOW(), NOW()
);

-- ================================================================
-- KẾT QUẢ
-- ================================================================
SELECT 
    v.id,
    v.roomName,
    l.subject,
    v.scheduledStartTime,
    v.scheduledEndTime,
    CASE 
        WHEN NOW() >= v.scheduledStartTime AND NOW() <= v.scheduledEndTime THEN '✅ JOIN NGAY'
        WHEN NOW() < v.scheduledStartTime AND TIMESTAMPDIFF(MINUTE, NOW(), v.scheduledStartTime) <= 15 THEN '🟡 SẮP TỚI'
        WHEN NOW() < v.scheduledStartTime THEN '⏰ CHƯA TỚI GIỜ'
        ELSE '❌ ĐÃ QUA'
    END AS status,
    TIMESTAMPDIFF(MINUTE, NOW(), v.scheduledStartTime) AS minutesToStart,
    v.accessToken,
    CONCAT('/prejoin-videolify-v2?accessToken=', v.accessToken) AS prejoinUrl
FROM video_call_sessions v
JOIN lessons l ON v.lessonId = l.id
WHERE v.roomName LIKE 'test-%'
ORDER BY v.scheduledStartTime;
