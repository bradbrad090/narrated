-- Set the photos bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'photos';