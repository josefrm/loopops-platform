# Migrating to New JWT Signing Keys

Supabase is moving from a **legacy JWT secret** (single shared secret, HS256) to **JWT signing keys** (asymmetric keys / JWKS). The new system improves security, allows zero-downtime rotation, and avoids signing users out when rotating keys.

## 1. In the Supabase Dashboard (hosted projects)

1. Open **Project Settings → JWT Keys**:  
   [https://supabase.com/dashboard/project/_/settings/jwt](https://supabase.com/dashboard/project/_/settings/jwt)
2. Click **Migrate JWT secret**.  
   This imports your existing JWT secret into the new signing keys system and creates a standby asymmetric key. **No downtime.**
3. When you’re ready to use the new key:
   - Ensure nothing verifies JWTs using the raw `JWT_SECRET` (see step 2 below).
   - Click **Rotate keys**. New tokens will be signed with the new key; existing tokens stay valid until they expire.
4. After rotating, wait at least **access token expiry + 15 minutes** (e.g. if expiry is 1 hour, wait 1h 15m), then you can **Revoke** the legacy JWT secret under “Previously used keys” so it’s no longer trusted.
5. To fully move off legacy API keys, switch to [publishable and secret API keys](https://supabase.com/docs/guides/api/api-keys) and disable `anon` / `service_role` if you revoke the legacy JWT secret.

References: [JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys), [Verifying a JWT](https://supabase.com/docs/guides/auth/jwts#verifying-a-jwt-from-supabase).

## 2. In this project (Edge Functions)

The **functions router** (`supabase/functions/main/index.ts`) has been updated to support both:

- **New signing keys (JWKS)** when `JWT_JWKS_URL` is set (hosted Supabase; new projects use this by default).
- **Legacy JWT secret** when only `JWT_SECRET` is set (e.g. local Supabase via Docker).

### Hosted Supabase (after migrating to signing keys)

1. Set the Edge Function secret for your project (use `JWT_JWKS_URL`; the CLI does not accept secret names starting with `SUPABASE_`):
   ```bash
   supabase secrets set JWT_JWKS_URL="https://<your-project-ref>.supabase.co/auth/v1/.well-known/jwks.json"
   ```
   Replace `<your-project-ref>` with your project reference (Dashboard → Settings → General). New projects already use asymmetric signing keys, so no dashboard migration is needed—just set this secret.

2. Do **not** rely on the legacy JWT secret in Edge Functions. The router will verify JWTs using the JWKS endpoint above.

3. Functions that have **Verify JWT** enabled in `config.toml` are protected by this router when it runs with `VERIFY_JWT=true`. No change needed in individual function code if they only receive requests that have already been validated by the router.

### Local / Docker Supabase

- Keep using `JWT_SECRET` only (no `SUPABASE_JWKS_URL`). The router continues to verify with the legacy secret. No migration steps required for local dev.

## 3. Other backends (APIs, servers)

If you verify Supabase JWTs in your own backend (Node, Python, etc.):

- **After migrating to signing keys:** verify using the JWKS URL instead of the JWT secret, e.g. with `jose`:
  ```ts
  import { jwtVerify, createRemoteJWKSet } from 'jose'
  const JWKS = createRemoteJWKSet(new URL('https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json'))
  const { payload } = await jwtVerify(token, JWKS)
  ```
- **Alternative:** call the Auth server: `GET https://<project-ref>.supabase.co/auth/v1/user` with `Authorization: Bearer <JWT>` and treat 200 as valid (simpler but adds latency and depends on Auth).

## Summary

| Environment        | What to set                                      | Router behavior        |
|--------------------|---------------------------------------------------|------------------------|
| Hosted (new keys)  | `JWT_JWKS_URL` = project JWKS URL                 | Verifies via JWKS      |
| Local / Docker     | `JWT_SECRET` only                                 | Verifies via secret    |
