-- Center-level toggle: if TRUE, radiologist reports must be approved by REPORT_APPROVER/CENTER_ADMIN
-- If FALSE, reports are auto-approved the moment the radiologist submits them
ALTER TABLE centers ADD COLUMN require_report_approval BOOLEAN NOT NULL DEFAULT TRUE;
