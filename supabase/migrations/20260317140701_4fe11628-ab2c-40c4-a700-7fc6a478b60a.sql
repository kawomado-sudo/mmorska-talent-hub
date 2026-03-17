ALTER TABLE hr.hr_reviewers ALTER COLUMN auth_user_id DROP NOT NULL;
ALTER TABLE hr.hr_reviewers ADD CONSTRAINT hr_reviewers_email_unique UNIQUE (email);