-- Create Teaching Experience Levels table
CREATE TABLE IF NOT EXISTS teaching_experience_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  label VARCHAR(50) NOT NULL,
  min_years INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Occupations table
CREATE TABLE IF NOT EXISTS occupations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  label VARCHAR(50) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert Teaching Experience Levels data
INSERT INTO teaching_experience_levels (code, label, min_years, sort_order) VALUES
  ('<1', 'Dưới 1 năm', 0, 1),
  ('1-2', '1-2 năm', 1, 2),
  ('3-5', '3-5 năm', 3, 3),
  ('5-10', '5-10 năm', 5, 4),
  ('10+', 'Trên 10 năm', 10, 5)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  min_years = VALUES(min_years),
  sort_order = VALUES(sort_order);

-- Insert Occupations data
INSERT INTO occupations (code, label, sort_order) VALUES
  ('teacher', 'Giáo viên', 1),
  ('student', 'Sinh viên', 2),
  ('tutor', 'Gia sư', 3),
  ('expert', 'Chuyên gia', 4)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  sort_order = VALUES(sort_order);
