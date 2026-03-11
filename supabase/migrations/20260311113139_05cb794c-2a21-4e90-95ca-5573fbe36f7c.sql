
-- Storage RLS for hr-cv bucket (drop if exists first)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload CVs" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can read CVs" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete CVs" ON storage.objects;
END $$;

CREATE POLICY "Authenticated users can upload CVs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hr-cv');
CREATE POLICY "Authenticated users can read CVs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'hr-cv');
CREATE POLICY "Authenticated users can delete CVs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hr-cv');
