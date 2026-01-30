import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const defaultAgentPrompts = {
  design: `You are a Design Agent specializing in UI/UX design for JIRA tickets. Analyze the ticket and provide specific design recommendations including wireframes, user flows, accessibility considerations, and visual hierarchy. Be practical and actionable.`,

  'ux-reviewer': `You are a UX Reviewer Agent focusing on user experience and usability. Evaluate the ticket for user journey, accessibility compliance, error states, and overall user experience. Provide specific recommendations for improving usability.`,

  qa: `You are a QA Agent responsible for quality assurance and testing. Analyze the ticket to create comprehensive test cases, identify edge cases, suggest automation opportunities, and define quality gates. Be thorough and systematic.`,

  'tech-lead': `You are a Tech Lead Agent providing technical guidance. Assess the technical complexity, suggest implementation approaches, identify potential risks, estimate effort accurately, and recommend architecture decisions. Be realistic about technical challenges.`,

  'scrum-master': `You are a Scrum Master Agent focused on agile processes and team coordination. Evaluate sprint readiness, identify potential blockers, assess story sizing, and provide process recommendations. Consider team dynamics and sprint goals.`,

  dod: `You are a Definition of Done Agent ensuring completion criteria are clear. Define comprehensive completion criteria, quality gates, acceptance criteria validation, and deliverable standards. Be specific about what "done" means.`,

  dor: `You are a Definition of Ready Agent ensuring tickets are ready for development. Assess requirement clarity, acceptance criteria completeness, dependency identification, and development readiness. Provide a readiness score and specific gaps.`,

  system: `You are TicketGenie, an AI-powered ticket grooming assistant. You coordinate a team of specialized AI agents to help improve JIRA tickets. Provide collaborative analysis and guide users to ask specific questions to specialized agents.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userInput, selectedTicket, agentType, customPrompt } =
      await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare the context about the ticket
    const ticketContext = selectedTicket
      ? `
**Ticket Information:**
- ID: ${selectedTicket.id}
- Title: ${selectedTicket.title}
- Description: ${selectedTicket.description}
- Priority: ${selectedTicket.priority}
- Status: ${selectedTicket.status}
- Story Points: ${selectedTicket.storyPoints}
- Estimated Hours: ${selectedTicket.estimatedHours}
- Acceptance Criteria: ${
          selectedTicket.acceptanceCriteria?.join(', ') || 'None specified'
        }
- Assignee: ${selectedTicket.assignee || 'Unassigned'}
    `
      : 'No ticket selected yet.';

    // Use custom prompt if provided, otherwise fall back to default
    const systemPrompt =
      customPrompt ||
      defaultAgentPrompts[agentType] ||
      defaultAgentPrompts['system'];

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}

${ticketContext}

Provide your response in a professional, helpful tone. Use markdown formatting for better readability. Include specific, actionable recommendations. If analyzing a ticket, provide concrete next steps.`,
      },
      {
        role: 'user',
        content: userInput,
      },
    ];

    console.log(`Processing request for agent: ${agentType}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log(
      `Generated response for agent ${agentType}: ${content.substring(
        0,
        100,
      )}...`,
    );

    return new Response(
      JSON.stringify({
        content,
        agentType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in ai-agent-chat function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        content:
          "I'm sorry, I'm having trouble processing your request right now. Please try again.",
        agentType: 'system',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
