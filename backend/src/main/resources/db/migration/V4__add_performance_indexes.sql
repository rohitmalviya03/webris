-- Composite index: dashboard and study-list queries filter by center + status together
CREATE INDEX idx_studies_center_status     ON studies(center_id, status);

-- Composite index: monthly stats and date-range queries
CREATE INDEX idx_studies_center_created_at ON studies(center_id, created_at);

-- Missing index on doctors.center_id (used by getAvailableDoctors every case-assignment load)
CREATE INDEX idx_doctors_center            ON doctors(center_id);

-- Missing index on reports.doctor_id (used by getReportsByDoctor / getDoctorCases)
CREATE INDEX idx_reports_doctor            ON reports(doctor_id);

-- Composite index: users per center (center admin user lists, SuperAdmin stats)
CREATE INDEX idx_users_center              ON users(center_id);

-- Composite index: active tests per center (test catalog dropdown on every study creation)
CREATE INDEX idx_test_catalog_center_active ON test_catalog(center_id, is_active);
