import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

// --- Interfaces ---
interface PaginationParams {
  page?: number;
  limit?: number;
  msg_page?: number;
  msg_limit?: number;
}

interface RequestBody {
  user_id: string;
  pagination?: {
    mindspace_buckets?: PaginationParams;
    project_memberships?: PaginationParams;
    agno_sessions?: PaginationParams;
    agno_memories?: PaginationParams;
  };
}

// --- Utils ---
const getPagination = (page: number = 1, limit: number = 100) => {
  const p = Math.max(1, page);
  const l = Math.max(1, limit);
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
};

const createResponse = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// --- Data Fetchers (Services) ---
async function fetchProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('v2_profile')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) console.error('Error fetching profile:', error);
  return data || null;
}

async function fetchOnboarding(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('v2_onboarding')
    .select('stage, completed')
    .eq('profile_id', userId)
    .maybeSingle();

  if (error) console.error('Error fetching onboarding:', error);
  return data || { stage: 0, completed: false, onboarding_details: {} };
}

async function fetchWorkspaces(client: SupabaseClient, userId: string, page = 1, limit = 50) {
  const { offset } = getPagination(page, limit);

  try {
    const { data: memberships, count, error } = await client
      .from('loopops_project_members')
      .select(`
        project_id, role, created_at,
        loopops_projects!inner (
          id, name, workspace_id,
          loopops_workspaces!inner ( id, name )
        )
      `, { count: 'exact' })
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transformación de datos
    const workspacesMap = new Map();
    memberships?.forEach((m: any) => {
      const p = m.loopops_projects;
      const w = p.loopops_workspaces;

      if (!workspacesMap.has(w.id)) {
        workspacesMap.set(w.id, { workspace_id: w.id, workspace_name: w.name, projects: [] });
      }
      workspacesMap.get(w.id).projects.push({
        project_id: p.id, project_name: p.name, role: m.role
      });
    });

    return {
      workspaces: Array.from(workspacesMap.values()),
      total_memberships: count || 0,
      showing_memberships: memberships?.length || 0,
      page, limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
    };
  } catch (err) {
    console.error('Error fetching workspaces:', err);
    return { workspaces: [], total_memberships: 0, page, limit, total_pages: 0 };
  }
}

async function fetchAgnoSessions(client: SupabaseClient, userId: string, params: PaginationParams) {
  try {
    const { data, error } = await client.rpc('get_agno_sessions_by_user', {
      p_user_id: userId,
      p_page: params.page || 1,
      p_limit: params.limit || 50,
      p_msg_page: params.msg_page || 1,
      p_msg_limit: params.msg_limit || 20,
    });

    if (error) throw error;

    return {
      sessions: data || [],
      total_count: data?.[0]?.total_count || 0,
    };
  } catch (err: any) {
    console.error('Error fetching sessions:', err);
    return { error: err.message, sessions: [] };
  }
}

async function fetchAgnoMemories(client: SupabaseClient, userId: string, page = 1, limit = 100) {
  try {
    const { data, error } = await client.rpc('get_agno_memories_by_user', {
      p_user_id: userId,
      p_page: page,
      p_limit: limit,
    });

    if (error) throw error;

    return {
      data: data || [],
      total_count: data?.[0]?.total_count || 0,
      page, limit
    };
  } catch (err) {
    console.error('Error fetching memories:', err);
    return { data: [], total_count: 0, page, limit };
  }
}

async function fetchMindspace(client: SupabaseClient, userId: string, page = 1, limit = 20) {
  const { offset } = getPagination(page, limit);
  try {
    const { data, count, error } = await client
      .from('loopops_mindspace_buckets')
      .select(`
        id, bucket_name, workspace_id, project_id, created_at,
        loopops_mindspace_files (
          id, file_name, file_size, mime_type, file_path, 
          created_at, created_in_editor, category_id
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      total_count: count || 0,
      showing: data?.length || 0,
      page, limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
    };
  } catch (err) {
    console.error('Error fetching mindspace:', err);
    return { data: [], total_count: 0, page, limit, total_pages: 0 };
  }
}

async function fetchAuthMetadata(client: SupabaseClient, userId: string) {
  try {
    const [identities, sessions] = await Promise.all([
      client.from('auth.identities').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      client.from('auth.sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    ]);
    return {
      identities_count: identities.count || 0,
      sessions_count: sessions.count || 0,
    };
  } catch (err) {
    console.error('Error fetching auth meta:', err);
    return { identities_count: 0, sessions_count: 0 };
  }
}

// --- Main Handler ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // 1. Setup & Auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return createResponse({ error: 'Missing authorization header' }, 401);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return createResponse({ error: 'Invalid token' }, 401);

    // 2. Input Validation
    const { user_id, pagination = {} } = (await req.json()) as RequestBody;

    if (!user_id) return createResponse({ error: 'user_id is required' }, 400);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) return createResponse({ error: 'Invalid user_id format' }, 400);

    console.log(`Fetching activity for: ${user_id}`);

    // 3. Parallel Data Fetching
    const results = await Promise.allSettled([
      fetchProfile(supabaseAdmin, user_id),
      fetchOnboarding(supabaseAdmin, user_id),
      fetchWorkspaces(supabaseAdmin, user_id, pagination.project_memberships?.page, pagination.project_memberships?.limit),
      fetchAgnoSessions(supabaseAdmin, user_id, pagination.agno_sessions || {}),
      fetchAgnoMemories(supabaseAdmin, user_id, pagination.agno_memories?.page, pagination.agno_memories?.limit),
      fetchMindspace(supabaseAdmin, user_id, pagination.mindspace_buckets?.page, pagination.mindspace_buckets?.limit),
      fetchAuthMetadata(supabaseAdmin, user_id)
    ]);

    // Helper para extraer el resultado o un valor default si falló la promesa (aunque las funciones ya manejan sus errores)
    const getResult = <T>(index: number, fallback: T): T =>
      results[index].status === 'fulfilled'
        ? (results[index] as PromiseFulfilledResult<T>).value
        : fallback;

    // 4. Construct Response
    const responseData = {
      user_id,
      timestamp: new Date().toISOString(),
      profile: getResult(0, null),
      onboarding_status: getResult(1, {}),
      workspaces_and_projects: getResult(2, {}),
      agno_sessions: getResult(3, { sessions: [] }),
      agno_memories: getResult(4, { data: [] }),
      mindspace_buckets: getResult(5, { data: [] }),
      auth_metadata: getResult(6, { identities_count: 0, sessions_count: 0 }),
    };

    return createResponse(responseData);

  } catch (error: any) {
    console.error('Critical error:', error);
    return createResponse({ error: error.message || 'Internal Server Error' }, 500);
  }
});