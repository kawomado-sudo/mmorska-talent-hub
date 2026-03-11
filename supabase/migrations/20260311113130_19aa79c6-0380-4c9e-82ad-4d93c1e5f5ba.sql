
-- Drop if partially created and recreate
DROP TABLE IF EXISTS hr.form_config CASCADE;
DROP TABLE IF EXISTS hr.application_status_log CASCADE;
DROP TABLE IF EXISTS hr.applications CASCADE;
DROP TABLE IF EXISTS hr.jobs CASCADE;

-- hr.jobs
CREATE TABLE hr.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text,
  description text,
  responsibilities text[] DEFAULT '{}',
  requirements text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  closed_at timestamptz
);

ALTER TABLE hr.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access on jobs" ON hr.jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- hr.applications
CREATE TABLE hr.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES hr.jobs(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  email text,
  phone text,
  cover_letter text,
  cv_url text,
  cv_link text,
  status text NOT NULL DEFAULT 'new',
  ai_summary text,
  ai_rating integer,
  recruiter_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hr.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access on applications" ON hr.applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- hr.application_status_log
CREATE TABLE hr.application_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES hr.applications(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE hr.application_status_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access on status_log" ON hr.application_status_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- hr.form_config
CREATE TABLE hr.form_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hr.form_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access on form_config" ON hr.form_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
