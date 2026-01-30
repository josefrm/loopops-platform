-- Add v2 schema to PostgREST search path
-- This allows the REST API to find tables in the v2 schema

-- Update the authenticator role's search path to include v2
ALTER ROLE authenticator SET search_path TO public, v2, auth, extensions;

-- Update the anon role's search path
ALTER ROLE anon SET search_path TO public, v2, auth, extensions;

-- Update the authenticated role's search path  
ALTER ROLE authenticated SET search_path TO public, v2, auth, extensions;

-- Reload the configuration
NOTIFY pgrst, 'reload schema';

-- Verify the search path
COMMENT ON SCHEMA v2 IS 'V2 schema exposed to PostgREST API';

