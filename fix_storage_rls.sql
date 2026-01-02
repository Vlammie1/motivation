-- Run this SQL in your Supabase Dashboard SQL Editor to fix the "new row violates row-level security policy" error.

-- 1. Allow authenticated users to upload files to the 'Lock in beat' bucket
CREATE POLICY "Allow uploads to Lock in beat"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'Lock in beat' );

-- 2. Allow everyone to view/download the beats (needed for playback)
CREATE POLICY "Allow public read access to Lock in beat"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'Lock in beat' );

-- 3. (Optional) Allow users to update/delete their own files
CREATE POLICY "Allow users to update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( bucket_id = 'Lock in beat' AND owner = auth.uid() );

CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING ( bucket_id = 'Lock in beat' AND owner = auth.uid() );
