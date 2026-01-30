-- Create reveal_secret function to retrieve secrets by ID from vault
CREATE OR REPLACE FUNCTION public.reveal_secret(secret_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  secret text;
BEGIN
  -- Restrict access to only the `service_role` to prevent direct client access to secrets
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id
  INTO secret;

  IF secret IS NULL THEN
    RAISE EXCEPTION 'Secret not found: %', secret_id;
  END IF;

  RETURN secret;
END;
$function$