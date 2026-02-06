import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";


interface ImpersonationRequest {
  target_user_email?: string;
  target_user_id?: string;
  reason: string;
  duration_seconds?: number;
}

interface ImpersonationLog {
  admin_user_id: string;
  admin_email: string;
  target_user_id: string;
  target_email: string;
  reason: string;
  created_at: string;
  expires_at: string;
  ip_address?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Solo permitir POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as ImpersonationRequest;
    const { target_user_email, target_user_id, reason, duration_seconds } = body;

    // Validación de parámetros
    if (!target_user_email && !target_user_id) {
      return new Response(
        JSON.stringify({ error: 'Either target_user_email or target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reason || reason.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'A valid reason is required (minimum 10 characters) for audit purposes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limitar duración (default: 1 hora, max: 4 horas)
    const MAX_DURATION = 4 * 60 * 60; // 4 horas en segundos
    const DEFAULT_DURATION = 60 * 60;  // 1 hora en segundos
    const tokenDuration = Math.min(duration_seconds || DEFAULT_DURATION, MAX_DURATION);

    // Crear cliente admin con service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // TODO: Validar permisos del usuario que hace la petición
    // Por ahora, esta función solo debería ser accesible por admins
    // En producción, agregar validación de rol/permiso aquí:
    //
    // const authHeader = req.headers.get('Authorization');
    // if (!authHeader) {
    //   return new Response(
    //     JSON.stringify({ error: 'Authorization header required' }),
    //     { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }
    // 
    // const token = authHeader.replace('Bearer ', '');
    // const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    // 
    // // Verificar que el admin tiene el rol correcto
    // const { data: adminProfile } = await supabaseAdmin
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', adminUser.id)
    //   .single();
    // 
    // if (!adminProfile || !['super_admin', 'support'].includes(adminProfile.role)) {
    //   return new Response(
    //     JSON.stringify({ error: 'Insufficient permissions for impersonation' }),
    //     { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Search for the target user
    let targetUser = null;

    if (target_user_id) {
      // Search by ID
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
      if (error) {
        console.error('Error fetching user by ID:', error);
        return new Response(
          JSON.stringify({ error: `Failed to find user: ${error.message}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetUser = user;
    } else if (target_user_email) {
      // Search by email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error('Error listing users:', listError);
        return new Response(
          JSON.stringify({ error: `Failed to list users: ${listError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetUser = users.find(u => u.email === target_user_email);
    }

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Impersonating user: ${targetUser.email} (${targetUser.id})`);

    // Generate a magic link for the target user
    // This creates a URL with a valid token that can be used to authenticate as the user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email!,
      options: {
        // redirectTo should be your app URL
        redirectTo: Deno.env.get('SITE_URL') || 'http://localhost:8080',
      }
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      return new Response(
        JSON.stringify({ error: `Failed to generate impersonation link: ${linkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the token from the magic link
    // The link has format: https://...supabase.co/auth/v1/verify?token=XXX&type=magiclink&redirect_to=...
    const magicLinkUrl = new URL(linkData.properties?.action_link || '');
    const token = magicLinkUrl.searchParams.get('token');
    const tokenHash = linkData.properties?.hashed_token;

    // Calculate timestamps
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokenDuration * 1000);

    // Create the audit log
    const impersonationLog: ImpersonationLog = {
      admin_user_id: 'pending_auth_validation', // TODO: Obtener del token del admin
      admin_email: 'pending_auth_validation',   // TODO: Obtener del token del admin  
      target_user_id: targetUser.id,
      target_email: targetUser.email || '',
      reason: reason,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    };

    console.log('Impersonation Log:', impersonationLog);

    // Try to save in the table (if it exists)
    try {
      await supabaseAdmin
        .from('impersonation_logs')
        .insert([{
          admin_user_id: impersonationLog.admin_user_id,
          admin_email: impersonationLog.admin_email,
          target_user_id: impersonationLog.target_user_id,
          target_email: impersonationLog.target_email,
          reason: impersonationLog.reason,
          created_at: impersonationLog.created_at,
          expires_at: impersonationLog.expires_at,
          ip_address: impersonationLog.ip_address,
        }]);
    } catch (logError) {
      // Si la tabla no existe, solo logueamos en consola
      console.warn('Could not save impersonation log to database:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Impersonation token generated for ${targetUser.email}`,
        data: {
          target_user: {
            id: targetUser.id,
            email: targetUser.email,
          },
          // The magic link
          magic_link: linkData.properties?.action_link,
          // The token to use directly with supabase.auth.verifyOtp()
          token: token,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          duration_seconds: tokenDuration,
        },
        audit: {
          reason: reason,
          logged_at: now.toISOString(),
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in impersonation function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
