-- ==============================================================================
-- ADD MINDSPACE FILE REFERENCE TO STAGE FILES
-- 
-- This migration adds the ability to track which stage files originated from
-- mindspace files, enabling "file in project context" functionality
-- ==============================================================================

-- Add mindspace_file_id column to stage_files table
ALTER TABLE loopops.stage_files 
ADD COLUMN IF NOT EXISTS mindspace_file_id UUID REFERENCES loopops.mindspace_files(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stage_files_mindspace_file_id 
ON loopops.stage_files(mindspace_file_id);

-- Add unique constraint to prevent duplicate copies of the same mindspace file to the same stage
-- A mindspace file can only be copied once to a specific stage bucket
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_files_unique_mindspace_per_bucket 
ON loopops.stage_files(stage_bucket_id, mindspace_file_id) 
WHERE mindspace_file_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN loopops.stage_files.mindspace_file_id IS 
'References the original mindspace file if this stage file was copied from mindspace. NULL if uploaded directly to stage.';

