-- Create function to update existing secrets in the vault
CREATE OR REPLACE FUNCTION public.update_secret(secret_name text, secret_value text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  secret_id text;
BEGIN
  -- Restrict access to only the `service_role` to prevent direct client access to secrets
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Update the secret in the vault
  UPDATE vault.secrets 
  SET secret = secret_value, updated_at = now()
  WHERE name = secret_name
  RETURNING id INTO secret_id;

  IF secret_id IS NULL THEN
    RAISE EXCEPTION 'Secret not found: %', secret_name;
  END IF;

  RETURN secret_id;
END;
$function$