
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { ticket_id, user_id, selected_ticket, get_empty_session, force_new_session } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let sessionId: string
    let isNewSession = false

    // Handle empty session request
    if (get_empty_session || force_new_session) {
      console.log(`Looking for empty session for user ${user_id}`)
      
      if (!force_new_session) {
        // First check if there's an existing empty session (no messages and no contexts)
        const { data: emptySessions, error: queryError } = await supabase
          .from('sessions')
          .select(`
            id,
            messages:messages(count),
            contexts:session_contexts(count)
          `)
          .eq('user_id', user_id)

        if (!queryError && emptySessions) {
          // Find a session with no messages and no contexts
          const emptySession = emptySessions.find(session => 
            session.messages[0]?.count === 0 && session.contexts[0]?.count === 0
          );

          if (emptySession) {
            sessionId = emptySession.id
            console.log(`Found existing empty session: ${sessionId}`)
          }
        }
      }

      // If no empty session found or force_new_session is true, create a new one
      if (!sessionId) {
        const { data: newSession, error: createError } = await supabase
          .from('sessions')
          .insert({ user_id })
          .select('id')
          .single()

        if (createError) {
          console.error('Error creating empty session:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create session' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        sessionId = newSession.id
        isNewSession = true
        console.log(`Created new empty session: ${sessionId}`)
      }
    } else {
      // Handle ticket-specific session (legacy behavior)
      console.log(`Looking for existing session for user ${user_id} and ticket ${ticket_id || 'general-chat'}`)

      let existingSessionQuery = supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user_id)

      if (ticket_id && ticket_id !== 'general-chat') {
        existingSessionQuery = existingSessionQuery.eq('ticket_id', ticket_id)
      } else {
        existingSessionQuery = existingSessionQuery.is('ticket_id', null)
      }

      const { data: existingSession, error: sessionError } = await existingSessionQuery.single()

      if (existingSession && !sessionError) {
        sessionId = existingSession.id
        console.log(`Found existing session: ${sessionId}`)
      } else {
        // Create new session
        const sessionData: any = {
          user_id
        }

        if (ticket_id && ticket_id !== 'general-chat') {
          sessionData.ticket_id = ticket_id
        }

        const { data: newSession, error: createError } = await supabase
          .from('sessions')
          .insert(sessionData)
          .select('id')
          .single()

        if (createError) {
          console.error('Error creating session:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create session' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        sessionId = newSession.id
        isNewSession = true
        console.log(`Created new session: ${sessionId}`)

        // Create initial message with ticket information if we have ticket details
        if (selected_ticket && ticket_id !== 'general-chat') {
          const ticketContent = `Ticket Information:
**${selected_ticket.id}: ${selected_ticket.title}**

**Status:** ${selected_ticket.status}
**Priority:** ${selected_ticket.priority}
**Assignee:** ${selected_ticket.assignee}
**Story Points:** ${selected_ticket.storyPoints}
**Estimated Hours:** ${selected_ticket.estimatedHours}

**Description:**
${selected_ticket.description}

**Acceptance Criteria:**
${selected_ticket.acceptanceCriteria?.map((criteria: string, index: number) => `${index + 1}. ${criteria}`).join('\n') || 'No acceptance criteria provided'}

**Labels:** ${selected_ticket.labels?.join(', ') || 'None'}
**Project:** ${selected_ticket.project}

This ticket is now ready for grooming and analysis by the AI agent team.`

          const { error: messageError } = await supabase
            .from('messages')
            .insert({
              session_id: sessionId,
              role: 'system',
              content: ticketContent
            })

          if (messageError) {
            console.error('Error creating initial message:', messageError)
            // Don't fail the entire operation if message creation fails
          } else {
            console.log('Created initial ticket message for session')
          }
        }
      }
    }

    // Fetch message history for this session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch message history' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Retrieved ${messages?.length || 0} messages for session ${sessionId}`)

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        messages: messages || [],
        is_new_session: isNewSession
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
