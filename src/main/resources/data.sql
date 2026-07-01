-- Seed data runs on every startup; INSERT IGNORE skips duplicates safely

-- Default center
INSERT IGNORE INTO centers (id, name, address, phone, email, is_active)
VALUES (1, 'ABC Diagnostic Center', '123 Medical Street, City', '+91-9876543210', 'contact@abcdiag.com', 1);

-- Super admin  (password = 'password')
INSERT IGNORE INTO users (id, username, email, password, full_name, role, center_id, is_active)
VALUES (1, 'superadmin', 'admin@ris.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Super Admin', 'SUPER_ADMIN', NULL, 1);

-- Center admin
INSERT IGNORE INTO users (id, username, email, password, full_name, role, center_id, is_active)
VALUES (2, 'centeradmin', 'centeradmin@abcdiag.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Center Admin', 'CENTER_ADMIN', 1, 1);

-- Radiologist user
INSERT IGNORE INTO users (id, username, email, password, full_name, role, center_id, is_active)
VALUES (3, 'drAmit', 'dramit@ris.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Dr. Amit Kumar', 'RADIOLOGIST', NULL, 1);

-- Doctor profile
INSERT IGNORE INTO doctors (id, user_id, name, specialization, qualification, email, is_active)
VALUES (1, 3, 'Dr. Amit Kumar', 'MRI', 'MBBS, MD Radiology', 'dramit@ris.com', 1);
