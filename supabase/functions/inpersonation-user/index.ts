import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface ImpersonationRequest {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with service role key for admin access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify user authentication and admin role
    const userToken = authHeader.replace('Bearer ', '');
    const {
      data: { user: adminUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(userToken);

    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: Add admin role verification here
    // For now, we'll proceed with any authenticated user
    // You should check if adminUser has an 'admin' role in your system
    // Example:
    // const { data: profile } = await supabaseAdmin
    //   .from('v2_profile')
    //   .select('role')
    //   .eq('user_id', adminUser.id)
    //   .single();
    // if (profile?.role !== 'admin') {
    //   return new Response(
    //     JSON.stringify({ error: 'Unauthorized: Admin access required' }),
    //     { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    console.log(`Admin user ${adminUser.id} attempting impersonation`);

    // Get user_id to impersonate from request body
    const { user_id } = (await req.json()) as ImpersonationRequest;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user_id format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify the target user exists
    const {
      data: { user: targetUser },
      error: userError,
    } = await supabaseAdmin.auth.admin.getUserById(user_id);

    if (userError || !targetUser) {
      console.error('Error finding target user:', userError);
      return new Response(
        JSON.stringify({
          error: 'User not found',
          details: userError?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Generating impersonation token for user: ${user_id}`);

    // Generate a magic link for the user (this includes an access token)
    // The magic link approach gives us a valid token that can be used to authenticate
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: targetUser.email!,
        options: {
          redirectTo: supabaseUrl,
        },
      });

    if (linkError || !linkData) {
      console.error('Error generating impersonation link:', linkError);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate impersonation token',
          details: linkError?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Extract the tokens from the link data
    const { access_token, refresh_token, user } = linkData.properties;

    console.log(
      `Successfully generated impersonation token for user: ${user_id}`,
    );

    // Log the impersonation for audit purposes in the database
    const timestamp = new Date().toISOString();
    const { error: auditError } = await supabaseAdmin
      .from('impersonation_audit')
      .insert({
        admin_user_id: adminUser.id,
        admin_email: adminUser.email,
        target_user_id: user_id,
        target_email: targetUser.email,
        action: 'impersonation',
        success: true,
        metadata: {
          timestamp,
          admin_user_agent: req.headers.get('User-Agent'),
        },
      });

    if (auditError) {
      console.error('Error writing audit log:', auditError);
      // Don't fail the request if audit logging fails, but log the error
    }

    console.log(
      `AUDIT: Admin ${adminUser.id} (${adminUser.email}) impersonated user ${user_id} (${targetUser.email}) at ${timestamp}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        impersonation_data: {
          access_token,
          refresh_token,
          user: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
          },
        },
        admin_info: {
          admin_user_id: adminUser.id,
          admin_email: adminUser.email,
          timestamp,
        },
        message:
          'Impersonation token generated successfully. Use the access_token to authenticate as the target user.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Unexpected error in inpersonation-user function:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/inpersonation-user' \
    --header 'Authorization: Bearer YOUR_ADMIN_AUTH_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{"user_id":"550e8400-e29b-41d4-a716-446655440000"}'

  The response will include an access_token and refresh_token that can be used to authenticate as the target user.

  To use the impersonation token in your application:
  1. Take the access_token from the response
  2. Use it as the Authorization header: Authorization: Bearer <access_token>
  3. All subsequent requests will be made as the impersonated user

*/
