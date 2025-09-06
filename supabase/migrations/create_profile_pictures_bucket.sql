-- Create profile-pictures storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures', 
  true,  -- Make bucket public so images can be accessed via public URLs
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']  -- Only allow image files
);


-- Create RLS policies for the profile-pictures bucket
CREATE POLICY "Users can upload profile pictures to their own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile pictures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view profile pictures" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');