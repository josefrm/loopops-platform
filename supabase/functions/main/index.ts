import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

console.log('[main] function started')

const JWT_SECRET = Deno.env.get('JWT_SECRET')
const JWT_JWKS_URL = Deno.env.get('JWT_JWKS_URL') // e.g. https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json (set via: supabase secrets set JWT_JWKS_URL=...)
const VERIFY_JWT = Deno.env.get('VERIFY_JWT') === 'true'

// Use JWKS (new signing keys) when URL is set; otherwise legacy JWT secret (local/dev)
const projectJWKS = JWT_JWKS_URL
  ? jose.createRemoteJWKSet(new URL(JWT_JWKS_URL))
  : null

console.log('[main] config', {
  VERIFY_JWT,
  hasJWT_JWKS_URL: !!JWT_JWKS_URL,
  hasJWT_SECRET: !!JWT_SECRET,
  authMode: projectJWKS ? 'JWKS' : 'JWT_SECRET',
})

function getAuthToken(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header')
  }
  const [bearer, token] = authHeader.split(' ')
  if (bearer !== 'Bearer') {
    throw new Error(`Auth header is not 'Bearer {token}'`)
  }
  return token
}

async function verifyJWT(jwt: string): Promise<boolean> {
  try {
    if (projectJWKS) {
      await jose.jwtVerify(jwt, projectJWKS)
      return true
    }
    if (!JWT_SECRET) {
      console.error('[main] neither JWT_JWKS_URL nor JWT_SECRET is set')
      return false
    }
    const encoder = new TextEncoder()
    const secretKey = encoder.encode(JWT_SECRET)
    await jose.jwtVerify(jwt, secretKey)
    return true
  } catch (err) {
    console.error('[main] jwtVerify error', err)
    return false
  }
}

serve(async (req: Request) => {
  const url = new URL(req.url)
  const { pathname } = url
  const path_parts = pathname.split('/')
  const service_name = path_parts[1]

  console.log('[main] request', { method: req.method, pathname, service_name })

  if (req.method !== 'OPTIONS' && VERIFY_JWT) {
    try {
      const token = getAuthToken(req)
      console.log('[main] verifying JWT', { authMode: projectJWKS ? 'JWKS' : 'JWT_SECRET' })
      const isValidJWT = await verifyJWT(token)

      if (!isValidJWT) {
        console.error('[main] JWT verification failed')
        return new Response(JSON.stringify({ msg: 'Invalid JWT' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      console.log('[main] JWT verified ok')
    } catch (e) {
      console.error('[main] JWT auth error', e)
      return new Response(JSON.stringify({ msg: e.toString() }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } else if (VERIFY_JWT && req.method === 'OPTIONS') {
    console.log('[main] skipping JWT for OPTIONS')
  }

  if (!service_name || service_name === '') {
    console.error('[main] missing function name', { pathname })
    const error = { msg: 'missing function name in request' }
    return new Response(JSON.stringify(error), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const servicePath = `/home/deno/functions/${service_name}`
  console.log('[main] forwarding to', servicePath)

  const memoryLimitMb = 150
  const workerTimeoutMs = 1 * 60 * 1000
  const noModuleCache = false
  const importMapPath = null
  const envVarsObj = Deno.env.toObject()
  const envVars = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])

  try {
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb,
      workerTimeoutMs,
      noModuleCache,
      importMapPath,
      envVars,
    })
    return await worker.fetch(req)
  } catch (e) {
    console.error('[main] worker error', e)
    const error = { msg: e.toString() }
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
