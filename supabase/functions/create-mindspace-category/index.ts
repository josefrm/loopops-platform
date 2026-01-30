import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

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

    // Verify user authentication
    const userToken = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(userToken);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { name } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'Category name is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const trimmedName = name.trim();

    // Fetch current categories
    const { data: preferences, error: fetchError } = await supabaseAdmin
      .from('v2_user_preferences')
      .select('mindspace_categories')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const categories = preferences?.mindspace_categories || [
      { id: 1, name: 'All', priority: 1 },
      { id: 2, name: 'Client', priority: 2 },
      { id: 3, name: 'Snippets', priority: 3 },
      { id: 4, name: 'Notes', priority: 4 },
    ];

    // Check for duplicate
    if (
      categories.some(
        (c: any) => c.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      return new Response(
        JSON.stringify({ error: 'Category already exists', categories }),
        {
          status: 409, // Conflict
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Add new category
    const maxId =
      categories.length > 0
        ? Math.max(...categories.map((c: any) => c.id || 0))
        : 0;
    const newId = maxId + 1;

    // Calculate priority (max priority + 1, or just length + 1)
    const maxPriority =
      categories.length > 0
        ? Math.max(...categories.map((c: any) => c.priority || 0))
        : 0;
    const newPriority = maxPriority + 1;

    const newCategory = {
      id: newId,
      name: trimmedName,
      priority: newPriority,
    };

    categories.push(newCategory);

    // Update preferences
    // Note: upsert is safe here because we are using profile_id unique constraint
    const { error: updateError } = await supabaseAdmin
      .from('v2_user_preferences')
      .upsert(
        {
          profile_id: user.id,
          mindspace_categories: categories,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'profile_id',
        },
      );

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, categories }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
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
