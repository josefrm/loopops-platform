-- Add created_in_editor column to loopops.mindspace_files table
-- This migration runs after table creation (unlike the 2024 one)

DO $$
BEGIN
  -- Check if the column exists to avoid errors on repeated runs
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'loopops'
      AND table_name = 'mindspace_files'
      AND column_name = 'created_in_editor'
  ) THEN
    ALTER TABLE loopops.mindspace_files
      ADD COLUMN created_in_editor BOOLEAN NOT NULL DEFAULT FALSE;

    COMMENT ON COLUMN loopops.mindspace_files.created_in_editor IS 'Indicates if the file was created using the FileEditor component and uploaded via create-mindspace-file endpoint';

    CREATE INDEX idx_loopops_mindspace_files_created_in_editor
      ON loopops.mindspace_files(created_in_editor);
  END IF;
END
$$;
