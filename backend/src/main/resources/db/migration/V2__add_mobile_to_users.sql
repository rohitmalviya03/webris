ALTER TABLE users
    ADD COLUMN mobile VARCHAR(20) NULL,
    ADD UNIQUE KEY uq_users_mobile (mobile);
