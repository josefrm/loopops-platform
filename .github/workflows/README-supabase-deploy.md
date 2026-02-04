# Supabase Deploy CI/CD

El workflow **Supabase Deploy (Migrations + Edge Functions)** se ejecuta al hacer **push (merge) a la rama `main`** y:

1. Enlaza el proyecto Supabase usando el ref y el token configurados.
2. Aplica las migraciones de base de datos (`supabase db push`).
3. Despliega todas las Edge Functions (`supabase functions deploy`).

## Configuración en GitHub

Usa un **Environment** (por ejemplo `production`) para centralizar secretos y variables.

### 1. Crear / usar un Environment

- Repo → **Settings** → **Environments** → crear o elegir uno (ej. `production`).

### 2. Secrets del Environment (obligatorios)

| Secret | Dónde obtenerlo |
|--------|------------------|
| **SUPABASE_ACCESS_TOKEN** | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) → Account → Access Tokens → Generate new token. |

### 3. Variables del Environment (obligatorias para este workflow)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| **SUPABASE_PROJECT_REF** | ID del proyecto (subdominio de la URL de Supabase). | Si tu URL es `https://rlnzqvrcygqleqyhdvek.supabase.co`, el ref es `rlnzqvrcygqleqyhdvek`. |

### 4. Variables para el frontend (recomendado: GitHub como fuente de verdad)

Para que el **build del frontend** use la URL del backend y Supabase correctas, configura las mismas variables en el **mismo Environment** (production). Así no dependes del `.env` en el repo (que está en `.gitignore`):

- **`VITE_BACKEND_API_URL`** — URL base del backend (ej. `http://34.225.211.204/`)
- **`VITE_SUPABASE_URL`**
- **`VITE_SUPABASE_ANON_KEY`**
- `VITE_USE_PROXY`, `VITE_SHOW_DEBUG_ROUTES`, `VITE_AUTH_REDIRECT_URL` (opcionales)

El workflow **Frontend Build** (`frontend-build.yml`) hace `npm run build` inyectando estas variables desde el Environment, así que el valor que pongas en GitHub es el que se usa en la app desplegada.

## Resumen

- **Cuándo se ejecuta:** al hacer push/merge a `main`.
- **Qué hace:** aplica migraciones y despliega Edge Functions en el proyecto Supabase indicado por `SUPABASE_PROJECT_REF`.
- **Dónde se configura:** Environment `production` (o el que uses en el workflow) en Settings → Environments.
