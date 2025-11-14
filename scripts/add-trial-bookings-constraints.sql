-- ==========================================
-- ADD CONSTRAINTS TO TRIAL_BOOKINGS
-- ==========================================
-- Add triggers and unique index only
-- ==========================================

-- Add UNIQUE index: one trial per student-tutor pair
ALTER TABLE trial_bookings
ADD UNIQUE INDEX idx_trial_bookings_student_tutor_unique (student_id, tutor_id);

-- Create triggers: prevent self-booking
DELIMITER $$

DROP TRIGGER IF EXISTS prevent_self_booking_trial_before_insert$$
CREATE TRIGGER prevent_self_booking_trial_before_insert
BEFORE INSERT ON trial_bookings
FOR EACH ROW
BEGIN
    DECLARE is_self_booking INT;

    SELECT COUNT(*) INTO is_self_booking
    FROM students s
    JOIN tutors t ON s.user_id = t.user_id
    WHERE s.id = NEW.student_id AND t.id = NEW.tutor_id;

    IF is_self_booking > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student cannot book themselves as tutor';
    END IF;
END$$

DROP TRIGGER IF EXISTS prevent_self_booking_trial_before_update$$
CREATE TRIGGER prevent_self_booking_trial_before_update
BEFORE UPDATE ON trial_bookings
FOR EACH ROW
BEGIN
    DECLARE is_self_booking INT;

    SELECT COUNT(*) INTO is_self_booking
    FROM students s
    JOIN tutors t ON s.user_id = t.user_id
    WHERE s.id = NEW.student_id AND t.id = NEW.tutor_id;

    IF is_self_booking > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student cannot book themselves as tutor';
    END IF;
END$$

DELIMITER ;

SELECT 'Constraints added successfully' AS status;
