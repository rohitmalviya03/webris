-- Centers table
CREATE TABLE centers (
    id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    address     TEXT,
    phone       VARCHAR(20),
    email       VARCHAR(100),
    logo_url    VARCHAR(500),
    is_active   TINYINT(1) DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users table
CREATE TABLE users (
    id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    role        VARCHAR(50) NOT NULL,
    center_id   BIGINT,
    is_active   TINYINT(1) DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email),
    CONSTRAINT fk_users_center FOREIGN KEY (center_id) REFERENCES centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Doctors table (Radiologists)
CREATE TABLE doctors (
    id              BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT,
    name            VARCHAR(255) NOT NULL,
    specialization  VARCHAR(100),
    qualification   VARCHAR(255),
    email           VARCHAR(100),
    phone           VARCHAR(20),
    signature_url   VARCHAR(500),
    is_active       TINYINT(1) DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_doctors_user (user_id),
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Patients table
CREATE TABLE patients (
    id                BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    patient_code      VARCHAR(50) NOT NULL,
    full_name         VARCHAR(255) NOT NULL,
    date_of_birth     DATE,
    age               INT,
    gender            VARCHAR(10),
    mobile            VARCHAR(20),
    email             VARCHAR(100),
    address           TEXT,
    referring_doctor  VARCHAR(255),
    center_id         BIGINT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_patients_code (patient_code),
    CONSTRAINT fk_patients_center FOREIGN KEY (center_id) REFERENCES centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Studies table
CREATE TABLE studies (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    lab_no              VARCHAR(50) NOT NULL,
    patient_id          BIGINT NOT NULL,
    center_id           BIGINT NOT NULL,
    study_description   VARCHAR(255) NOT NULL,
    modality            VARCHAR(20) NOT NULL,
    body_part           VARCHAR(100),
    clinical_history    TEXT,
    referring_doctor    VARCHAR(255),
    accession_number    VARCHAR(100),
    orthanc_study_id    VARCHAR(255),
    study_instance_uid  VARCHAR(255),
    status              VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
    assigned_doctor_id  BIGINT,
    assigned_at         DATETIME,
    created_by          BIGINT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_studies_lab_no (lab_no),
    UNIQUE KEY uq_studies_accession (accession_number),
    CONSTRAINT fk_studies_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_studies_center  FOREIGN KEY (center_id)  REFERENCES centers(id),
    CONSTRAINT fk_studies_doctor  FOREIGN KEY (assigned_doctor_id) REFERENCES doctors(id),
    CONSTRAINT fk_studies_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Billing table
CREATE TABLE billing (
    id              BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    study_id        BIGINT NOT NULL,
    invoice_no      VARCHAR(50) NOT NULL,
    test_name       VARCHAR(255) NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    discount        DECIMAL(10,2) DEFAULT 0.00,
    tax             DECIMAL(10,2) DEFAULT 0.00,
    net_amount      DECIMAL(10,2) NOT NULL,
    payment_status  VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payment_mode    VARCHAR(50),
    payment_date    DATETIME,
    notes           TEXT,
    created_by      BIGINT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_billing_invoice (invoice_no),
    UNIQUE KEY uq_billing_study (study_id),
    CONSTRAINT fk_billing_study      FOREIGN KEY (study_id)   REFERENCES studies(id),
    CONSTRAINT fk_billing_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reports table
CREATE TABLE reports (
    id               BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    study_id         BIGINT NOT NULL,
    doctor_id        BIGINT NOT NULL,
    clinical_history TEXT,
    findings         TEXT,
    impression       TEXT,
    conclusion       TEXT,
    recommendations  TEXT,
    status           VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    submitted_at     DATETIME,
    approved_by      BIGINT,
    approved_at      DATETIME,
    rejection_reason TEXT,
    pdf_url          VARCHAR(500),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_reports_study (study_id),
    CONSTRAINT fk_reports_study       FOREIGN KEY (study_id)   REFERENCES studies(id),
    CONSTRAINT fk_reports_doctor      FOREIGN KEY (doctor_id)  REFERENCES doctors(id),
    CONSTRAINT fk_reports_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit logs table
CREATE TABLE audit_logs (
    id           BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id      BIGINT,
    action       VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    BIGINT,
    details      TEXT,
    ip_address   VARCHAR(45),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes
CREATE INDEX idx_patients_mobile  ON patients(mobile);
CREATE INDEX idx_patients_center  ON patients(center_id);
CREATE INDEX idx_studies_center   ON studies(center_id);
CREATE INDEX idx_studies_status   ON studies(status);
CREATE INDEX idx_studies_doctor   ON studies(assigned_doctor_id);
CREATE INDEX idx_audit_user       ON audit_logs(user_id);
CREATE INDEX idx_audit_created    ON audit_logs(created_at);

-- Seed: default super admin (password = 'password')
INSERT INTO users (username, email, password, full_name, role, is_active)
VALUES ('superadmin', 'admin@ris.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Super Admin', 'SUPER_ADMIN', 1);

-- Seed: default center
INSERT INTO centers (name, address, phone, email)
VALUES ('ABC Diagnostic Center', '123 Medical Street, City', '+91-9876543210', 'contact@abcdiag.com');

-- Seed: center admin
INSERT INTO users (username, email, password, full_name, role, center_id, is_active)
VALUES ('centeradmin', 'centeradmin@abcdiag.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Center Admin', 'CENTER_ADMIN', 1, 1);

-- Seed: radiologist user
INSERT INTO users (username, email, password, full_name, role, is_active)
VALUES ('drAmit', 'dramit@ris.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Dr. Amit Kumar', 'RADIOLOGIST', 1);

-- Seed: doctor profile
INSERT INTO doctors (user_id, name, specialization, qualification, email)
VALUES (3, 'Dr. Amit Kumar', 'MRI', 'MBBS, MD Radiology', 'dramit@ris.com');
