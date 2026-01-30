import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";

interface DeleteUserRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json() as DeleteUserRequest;
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attempting to delete user with email: ${email}`);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: `Failed to list users: ${listError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      return new Response(
        JSON.stringify({ error: `User with email ${email} not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Found user with id: ${userId}`);

    // Delete foreign key records first
    // 1. Delete from onboarding_status
    const { error: onboardingError } = await supabaseAdmin
      .from('onboarding_status')
      .delete()
      .eq('user_id', userId);

    if (onboardingError) {
      console.error('Error deleting onboarding_status:', onboardingError);
      return new Response(
        JSON.stringify({ error: `Failed to delete onboarding_status: ${onboardingError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleted onboarding_status records');

    // 2. Delete from sessions
    const { error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    if (sessionsError) {
      console.error('Error deleting sessions:', sessionsError);
      return new Response(
        JSON.stringify({ error: `Failed to delete sessions: ${sessionsError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleted sessions records');

    // Delete user from auth.users
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteUserError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted user ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${email} deleted successfully`,
        userId 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in delete-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
