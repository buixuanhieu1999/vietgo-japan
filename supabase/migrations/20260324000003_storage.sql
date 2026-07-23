-- ============================================================
-- Storage buckets and policies
-- public-assets: public read
-- private-documents: private, signed URL only
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'public-assets',
    'public-assets',
    true,
    5242880,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf'
    ]
  ),
  (
    'private-documents',
    'private-documents',
    false,
    10485760,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- public-assets: anyone can read; only staff can write
CREATE POLICY public_assets_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'public-assets');

CREATE POLICY public_assets_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-assets'
    AND public.is_admin()
  );

CREATE POLICY public_assets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'public-assets' AND public.is_admin());

CREATE POLICY public_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_admin());

-- private-documents: owner folder = auth.uid() OR staff
CREATE POLICY private_docs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_any_role('support_agent', 'admin', 'super_admin', 'dispatcher')
    )
  );

CREATE POLICY private_docs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'private-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_staff()
    )
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'pdf')
  );

CREATE POLICY private_docs_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_any_role('admin', 'super_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'private-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_any_role('admin', 'super_admin')
    )
  );

CREATE POLICY private_docs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_any_role('admin', 'super_admin')
    )
  );
