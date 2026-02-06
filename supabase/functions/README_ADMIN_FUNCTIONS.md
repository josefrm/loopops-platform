# Admin Functions - User Activity & Impersonation

Este documento describe las funciones administrativas para obtener actividad de usuarios e impersonación.

## Funciones Disponibles

### 1. `get-activity-user` - Obtener Actividad de Usuario

Obtiene toda la actividad de un usuario a través de todas las tablas relacionadas.

#### Endpoint
```
POST /functions/v1/get-activity-user
```

#### Request
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Headers
```
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json
```

#### Response
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_messages": [...],
  "agno_memories": [...],
  "agno_sessions": [...],
  "chat_histories": [...],
  "loopops_main_sessions": [...],
  "loopops_mindspace_buckets": [...],
  "loopops_plugin_auth_codes": [...],
  "loopops_sessions": [...],
  "mindspace_buckets": [...],
  "onboarding_status": [...],
  "plugin_auth_codes": [...],
  "v2_profile": [...],
  "sessions_public": [...],
  "sessions_loopops": [...],
  "v2_profile_public": [...],
  "workspace_members": [...],
  "identities_count": 1,
  "mfa_factors_count": 0,
  "sessions_count": 2,
  "refresh_tokens_count": 1
}
```

#### Ejemplo cURL
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-activity-user' \
  --header 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"user_id":"550e8400-e29b-41d4-a716-446655440000"}'
```

---

### 2. `inpersonation-user` - Impersonar Usuario

Genera un token JWT para impersonar a un usuario. Esto permite a un administrador autenticarse como el usuario objetivo.

#### Endpoint
```
POST /functions/v1/inpersonation-user
```

#### Request
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Headers
```
Authorization: Bearer YOUR_ADMIN_AUTH_TOKEN
Content-Type: application/json
```

#### Response
```json
{
  "success": true,
  "impersonation_data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "email_confirmed_at": "2026-01-15T10:30:00Z",
      "last_sign_in_at": "2026-02-05T14:20:00Z"
    }
  },
  "admin_info": {
    "admin_user_id": "admin-uuid-here",
    "admin_email": "admin@example.com",
    "timestamp": "2026-02-06T12:00:00Z"
  },
  "message": "Impersonation token generated successfully. Use the access_token to authenticate as the target user."
}
```

#### Cómo usar el token de impersonación

1. Llama a la función con el `user_id` del usuario que quieres impersonar
2. Obtén el `access_token` de la respuesta
3. Usa este token en tus siguientes requests como header de autorización:

```bash
# Ejemplo: Hacer un request como el usuario impersonado
curl -i --location --request GET 'http://127.0.0.1:54321/rest/v1/your-endpoint' \
  --header 'Authorization: Bearer <impersonation_access_token>' \
  --header 'apikey: YOUR_ANON_KEY'
```

#### Ejemplo cURL
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/inpersonation-user' \
  --header 'Authorization: Bearer YOUR_ADMIN_AUTH_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"user_id":"550e8400-e29b-41d4-a716-446655440000"}'
```

---

## Base de Datos

### Función PostgreSQL: `get_user_activity`

Ubicación: `public.get_user_activity(p_user_id UUID)`

Esta función agrega toda la actividad del usuario de múltiples tablas y la devuelve como JSON.

#### Uso directo en SQL
```sql
SELECT * FROM public.get_user_activity('550e8400-e29b-41d4-a716-446655440000');
```

### Tabla de Auditoría: `impersonation_audit`

Todas las impersonaciones se registran en la tabla `public.impersonation_audit` para fines de seguridad y cumplimiento.

Campos:
- `id`: UUID único del evento
- `admin_user_id`: UUID del administrador que realizó la impersonación
- `admin_email`: Email del administrador
- `target_user_id`: UUID del usuario impersonado
- `target_email`: Email del usuario impersonado
- `action`: Tipo de acción (por defecto 'impersonation')
- `success`: Si la impersonación fue exitosa
- `error_message`: Mensaje de error si falló
- `metadata`: Información adicional (JSON)
- `created_at`: Timestamp del evento

### Función PostgreSQL: `get_impersonation_audit`

Ubicación: `public.get_impersonation_audit(...)`

Recupera logs de auditoría con filtros opcionales.

#### Parámetros
- `p_admin_user_id` (opcional): Filtrar por administrador
- `p_target_user_id` (opcional): Filtrar por usuario objetivo
- `p_start_date` (opcional): Fecha de inicio
- `p_end_date` (opcional): Fecha de fin
- `p_limit` (opcional, default 100): Número máximo de registros

#### Uso directo en SQL
```sql
-- Ver todas las impersonaciones de los últimos 7 días
SELECT * FROM public.get_impersonation_audit(
  NULL,
  NULL,
  NOW() - INTERVAL '7 days',
  NOW(),
  100
);

-- Ver impersonaciones realizadas por un admin específico
SELECT * FROM public.get_impersonation_audit(
  'admin-uuid-here',
  NULL,
  NULL,
  NULL,
  50
);

-- Ver todas las veces que un usuario específico fue impersonado
SELECT * FROM public.get_impersonation_audit(
  NULL,
  'target-user-uuid-here',
  NULL,
  NULL,
  50
);
```

---

## Seguridad

### Consideraciones Importantes

1. **Verificación de Roles**: Actualmente las funciones requieren autenticación pero no verifican roles de administrador. Debes implementar la verificación de roles antes de usar en producción.

2. **Auditoría**: Todas las impersonaciones se registran automáticamente en la tabla `impersonation_audit`.

3. **Permisos**:
   - Solo `service_role` puede ejecutar `get_user_activity`
   - Solo `service_role` puede escribir en `impersonation_audit`
   - Solo `service_role` puede ejecutar `get_impersonation_audit`

4. **TODO - Implementar verificación de admin**: En el archivo `/supabase/functions/inpersonation-user/index.ts`, descomenta y modifica el código para verificar roles:

```typescript
// TODO: Add admin role verification here
const { data: profile } = await supabaseAdmin
  .from('v2_profile')
  .select('role')
  .eq('user_id', adminUser.id)
  .single();

if (profile?.role !== 'admin') {
  return new Response(
    JSON.stringify({ error: 'Unauthorized: Admin access required' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## Migraciones

Las siguientes migraciones fueron creadas:

1. `20260206190000_create_get_user_activity_function.sql`
   - Crea la función `public.get_user_activity()`

2. `20260206190001_create_impersonation_audit_table.sql`
   - Crea la tabla `public.impersonation_audit`
   - Configura RLS (Row Level Security)
   - Crea índices para optimización

3. `20260206190002_create_get_impersonation_audit_function.sql`
   - Crea la función `public.get_impersonation_audit()`

Para aplicar las migraciones:
```bash
supabase db push
```

---

## Diagrama de Flujo

```
Admin Panel → JWT admin
              ↓
         Impersonation
              ↓
         Active users → Workspace + projects → Loops → KB → Mindspace
```

---

## Testing Local

1. Inicia Supabase local:
```bash
supabase start
```

2. Aplica las migraciones:
```bash
supabase db push
```

3. Prueba la función de actividad:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-activity-user' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"user_id":"USER_UUID"}'
```

4. Prueba la función de impersonación:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/inpersonation-user' \
  --header 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"user_id":"USER_UUID"}'
```

---

## Notas Adicionales

- Los errores de TypeScript en el IDE son esperados ya que el linter no tiene acceso a los tipos de Deno. Las funciones funcionarán correctamente en runtime.
- Se recomienda implementar rate limiting para prevenir abuso de la función de impersonación.
- Considera implementar notificaciones al usuario cuando un admin lo impersona (si aplica a tu caso de uso).
