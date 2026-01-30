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

### 4. Mismas variables que tu `.env` (opcional para este workflow)

Puedes añadir en el mismo Environment las mismas variables que usas en tu `.env` (para otros workflows o para tener todo centralizado):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BACKEND_API_URL`
- `VITE_USE_PROXY`
- etc.

Este workflow **solo necesita** `SUPABASE_ACCESS_TOKEN` (secret) y `SUPABASE_PROJECT_REF` (variable) para ejecutarse.

## Resumen

- **Cuándo se ejecuta:** al hacer push/merge a `main`.
- **Qué hace:** aplica migraciones y despliega Edge Functions en el proyecto Supabase indicado por `SUPABASE_PROJECT_REF`.
- **Dónde se configura:** Environment `production` (o el que uses en el workflow) en Settings → Environments.
