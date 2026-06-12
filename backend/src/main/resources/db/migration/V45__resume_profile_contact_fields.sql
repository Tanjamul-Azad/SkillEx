ALTER TABLE resume_profiles
    ADD COLUMN email     VARCHAR(255) NULL AFTER headline,
    ADD COLUMN phone     VARCHAR(50)  NULL AFTER email,
    ADD COLUMN address   VARCHAR(300) NULL AFTER phone;
