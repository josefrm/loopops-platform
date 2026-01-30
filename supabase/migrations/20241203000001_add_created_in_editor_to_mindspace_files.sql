-- Add created_in_editor column to loopops_mindspace_files table only if it does not exist
-- This migration checks if the loopops schema exists before attempting to modify tables

DO $$
BEGIN
  -- First check if the loopops schema exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'loopops'
  ) THEN
    -- Then check if the table exists in that schema
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'loopops'
        AND table_name = 'mindspace_files'
    ) THEN
      -- Finally check if the column doesn't already exist
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
    END IF;
  END IF;
END
$$;