import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";

interface UpdateProfileRequest {
  name: string;
  role?: string;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body first
    const requestBody = await req.json() as UpdateProfileRequest;
    const { name, role, user_id } = requestBody;
    
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    
    // Try to get user from JWT, fallback to user_id from body
    let userId: string | null = user_id || null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (!authError && user) {
        userId = user.id;
        console.log('update-profile-v2: Authenticated user from JWT:', user.id);
      } else {
        console.error('update-profile-v2: JWT validation failed, using user_id from body');
      }
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!name || name.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating profile for user ${userId} with name: ${name}, role: ${role || 'none'}`);

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update profile in v2_profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('v2_profile')
      .update({
        name: name.trim(),
        role: role?.trim() || null,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response(
        JSON.stringify({ error: `Failed to update profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Profile updated for user ${userId}`);

    return new Response(
      JSON.stringify({
        profile: {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          email: profile.email,
        },
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in update-profile-v2 function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
