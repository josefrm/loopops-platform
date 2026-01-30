CREATE OR REPLACE FUNCTION public.update_secret(
    secret_id UUID,
    new_secret TEXT DEFAULT NULL,
    new_name TEXT DEFAULT NULL,
    new_description TEXT DEFAULT NULL
)
RETURNS void -- This function will now return void, similar to vault.update_secret
LANGUAGE plpgsql
AS $$
BEGIN
  -- Restrict access to only the `service_role` to prevent direct client access to secrets
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Call the vault.update_secret function to perform the actual update and encryption.
  -- All parameters received by public.update_secret are directly passed to vault.update_secret.
  PERFORM vault.update_secret(
    secret_id := secret_id,
    new_secret := new_secret,
    new_name := new_name,
    new_description := new_description
  );

  -- No explicit return value needed as vault.update_secret returns void, and this is a proxy.
END;
$$;