import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface UpdateStageRequest {
  stage: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body first
    const requestBody = (await req.json()) as UpdateStageRequest & {
      user_id?: string;
    };
    const { stage, user_id } = requestBody;

    // Get Authorization header from request
    const authHeader = req.headers.get('Authorization');

    // Try to get user from JWT if auth header is provided
    let userId: string | null = user_id || null;

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        },
      );

      // Get the authenticated user from the JWT
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser();

      if (!authError && user) {
        userId = user.id;
        console.log(
          'update-onboarding-stage: Authenticated user from JWT:',
          user.id,
        );
      } else {
        console.error(
          'update-onboarding-stage: JWT validation failed:',
          authError,
        );
        // Fallback to user_id from body if provided
        if (user_id) {
          console.log(
            'update-onboarding-stage: Using user_id from request body:',
            user_id,
          );
          userId = user_id;
        }
      }
    }

    // Require user_id one way or another
    if (!userId) {
      return new Response(
        JSON.stringify({
          error: 'user_id required (either from JWT or request body)',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate stage
    if (typeof stage !== 'number' || stage < 0 || stage > 3) {
      return new Response(
        JSON.stringify({
          error: 'Invalid stage. Must be a number between 0 and 3',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Updating onboarding stage to ${stage} for user ${userId}`);

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Upsert onboarding stage (insert or update)
    const { data: onboarding, error: onboardingError } = await supabaseAdmin
      .schema('v2')
      .from('onboarding')
      .upsert(
        {
          profile_id: userId,
          stage,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'profile_id',
        },
      )
      .select()
      .single();

    if (onboardingError) {
      console.error('Error updating onboarding stage:', onboardingError);
      return new Response(
        JSON.stringify({
          error: `Failed to update onboarding stage: ${onboardingError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Onboarding stage updated to ${stage} for user ${userId}`);

    return new Response(
      JSON.stringify({
        onboarding: {
          stage: onboarding.stage,
          completed: onboarding.completed,
          profile_id: onboarding.profile_id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error(
      'Unexpected error in update-onboarding-stage function:',
      error,
    );
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
