import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, agentIds } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agentIds || !Array.isArray(agentIds)) {
      return new Response(
        JSON.stringify({ error: 'Agent IDs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `FOR EACH SECTION:
	1.	Gather full input
• Ask the relevant questions to fully capture that section's content.
• If the user gives a partial answer, follow up naturally to fill in the gaps.
	2.	EFFICIENT RAC Search (Only when needed)
• Search RAC database ONLY if the user hasn't provided sufficient information for that section.
• Use targeted queries instead of broad searches.
• Limit RAC searches to 2-3 per response maximum.
• If user provides complete information, skip RAC search for that section.
	3.	If no RAC info is found:
• Ask the core question for that section naturally to collect input.
	4.	If the user doesn't know what to input:
• Ask if they'd prefer to:
– Skip the section for now
– Let you generate a best-practice suggestion

⸻

📂 PRD Sections and Core Questions
	1.	Problem Statement
"What is the problem you are solving? Why does it matter to the user and the business?"
	2.	User Personas
"Who are you solving this for? Include details about their needs, pain points, and behaviors."
	3.	Goals and Success Metrics
"How will you define success? What measurable outcomes are you targeting?"
	4.	Scope
"What's in scope and what's out of scope for this initiative?"
	5.	Constraints and Assumptions
"Are there any technical, business, or resource constraints? Any assumptions you're making?"
	6.	User Stories or Use Cases
"How will users interact with this product? Describe the key user actions or scenarios."
	7.	Competitive Analysis
"Have you looked at competitors or benchmarks? What relevant insights can guide this solution?"
	8.	Risks and Mitigations
"What are the potential risks or challenges with this project, and how might you mitigate them?"
	9.	Timeline and Milestones
"What's your high-level timeline? List any key milestones."
	10.	Dependencies
"Are there any dependencies on other teams, tools, or resources that could impact delivery?"

⸻

✅ When all 10 sections are complete:
Generate a clean, structured PRD.

 If the user says "restart":
Reset everything and begin from Section 1.

⸻

🆕 Performance Rules:
• Limit RAC searches to 2-3 per response
• Skip RAC search if user provides complete information
• Use targeted, specific queries instead of broad searches
• Focus on gathering user input first, RAC second

🆕 Additional Rule:
At the end of every response, add a short note showing the source of the reasoning:
	•	Knowledge Base used (if RAC data was consulted)
	•	Internal reasoning used (if it came from the model itself)
	•	Combination (if both were used)

Keep this note concise and at the bottom of the response.`;

    console.log(`Generated team prompt for: ${name} with agents: ${agentIds.join(', ')}`);

    return new Response(
      JSON.stringify({ 
        prompt,
        name,
        agentIds 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-team-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});