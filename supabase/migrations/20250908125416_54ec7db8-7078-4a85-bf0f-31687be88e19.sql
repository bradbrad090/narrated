-- Add status column to chapters table
ALTER TABLE chapters ADD COLUMN status TEXT DEFAULT 'draft';

-- Enable pgmq extension for queue functionality
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the pdf_jobs queue
SELECT pgmq.create('pdf_jobs');