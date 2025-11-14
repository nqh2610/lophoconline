-- Script kiểm tra gia sư đã đăng ký

-- 1. Xem tất cả gia sư pending
SELECT 
    t.id,
    t.full_name,
    t.verification_status,
    t.created_at,
    u.email,
    u.username
FROM tutors t
LEFT JOIN users u ON t.user_id = u.id
WHERE t.verification_status = 'pending'
ORDER BY t.created_at DESC;

-- 2. Xem gia sư mới nhất
SELECT 
    t.*,
    u.email
FROM tutors t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 5;

-- 3. Đếm gia sư theo status
SELECT 
    verification_status,
    COUNT(*) as count
FROM tutors
GROUP BY verification_status;

-- 4. Duyệt gia sư (chạy khi cần)
-- UPDATE tutors 
-- SET verification_status = 'verified' 
-- WHERE id = <TUTOR_ID>;

-- 5. Xem gia sư với subjects
SELECT 
    t.id,
    t.full_name,
    t.verification_status,
    t.subjects,
    COUNT(ts.id) as subject_count
FROM tutors t
LEFT JOIN tutor_subjects ts ON t.id = ts.tutor_id
GROUP BY t.id
ORDER BY t.created_at DESC;
