import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CompleteWalkthroughRequest {
  window_key: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Create Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError) {
      console.error('Auth error:', JSON.stringify(authError));
      throw new Error(`Unauthorized: ${authError.message}`);
    }

    if (!user) {
      console.error('No user found in auth context');
      throw new Error('Unauthorized: No user found');
    }

    // Parse request body
    let body: CompleteWalkthroughRequest;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid JSON body');
    }

    const { window_key } = body;

    if (!window_key || typeof window_key !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'window_key is required and must be a string',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Marking walkthrough '${window_key}' as completed for user ${user.id}`,
    );

    // Create service role client for database operations (to ensure we can write to user_preferences if RLS is tricky,
    // though the user should be able to write to their own preferences properly configured.
    // However, to be safe and consistent with update-onboarding-stage, we can use service role for the DB update
    // AFTER validating the user via the anon client above.)
    // Actually, let's try to use the user's client first?
    // The `v2.user_preferences` table has RLS:
    // "Users can update their own preferences" using (profile_id = auth.uid())
    // So the authenticated `supabaseClient` should work.
    // BUT `update-onboarding-stage` uses service role. I will stick to service role for reliability in edge function context
    // and to minimize "RLS policy not matching" friction during development, matching the existing pattern.

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Fetch existing preferences
    const { data: preferences, error: fetchError } = await supabaseAdmin
      .from('v2_user_preferences')
      .select('walkthroughs, profile_id')
      .eq('profile_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "The result contains 0 rows"
      throw fetchError;
    }

    // Prepare new walkthroughs object
    let currentWalkthroughs = preferences?.walkthroughs || {};
    // If it comes back as string (some legacy json handling), parse it, but supabase js usually gives object for jsonb
    if (typeof currentWalkthroughs === 'string') {
      try {
        currentWalkthroughs = JSON.parse(currentWalkthroughs);
      } catch (e) {
        currentWalkthroughs = {};
      }
    }

    const updatedWalkthroughs = {
      ...currentWalkthroughs,
      [window_key]: true,
    };

    // 2. Upsert preferences
    const { data: updatedPreferences, error: updateError } = await supabaseAdmin
      .from('v2_user_preferences')
      .upsert(
        {
          profile_id: user.id,
          walkthroughs: updatedWalkthroughs,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'profile_id',
        },
      )
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        message: 'Walkthrough marked as completed',
        data: updatedPreferences,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in complete-walkthrough:', error);
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    const status = message.startsWith('Unauthorized')
      ? 401
      : message === 'Method not allowed'
      ? 405
      : 500;

    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
