
-- 1. Create hr.hr_reviewers table
CREATE TABLE hr.hr_reviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (auth_user_id)
);

-- 2. Add assigned_reviewer_id to hr.applications
ALTER TABLE hr.applications 
  ADD COLUMN assigned_reviewer_id uuid REFERENCES auth.users(id);

-- 3. Grant permissions to service_role
GRANT ALL ON TABLE hr.hr_reviewers TO service_role;
