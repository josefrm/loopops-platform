import { AgentService } from '@/services/AgentService';
import { agentPromptService } from './agentPromptService';

interface AgentResponse {
  content: string;
  agentType: string;
}

class AgentResponseService {
  async getResponse(
    userInput: string,
    selectedTicket: any,
  ): Promise<AgentResponse> {
    try {
      // Determine agent type based on input keywords
      const agentType = this.determineAgentType(userInput.toLowerCase());

      // Get the custom prompt for this agent
      const customPrompt = agentPromptService.getPrompt(agentType);

      console.log(`Requesting AI response for agent: ${agentType}`);

      // Call the AI agent service
      const response = await AgentService.getAiAgentResponse({
        userInput,
        selectedTicket,
        agentType,
        customPrompt,
      });

      return {
        content: response.content,
        agentType: response.agentType,
      };
    } catch (error) {
      console.error('Error in getResponse:', error);
      return this.getFallbackResponse('system', userInput, selectedTicket);
    }
  }

  private determineAgentType(input: string): string {
    if (
      input.includes('design') ||
      input.includes('ui') ||
      input.includes('ux') ||
      input.includes('wireframe') ||
      input.includes('mockup')
    ) {
      return 'design';
    } else if (
      input.includes('test') ||
      input.includes('qa') ||
      input.includes('quality') ||
      input.includes('bug')
    ) {
      return 'qa';
    } else if (
      input.includes('technical') ||
      input.includes('estimate') ||
      input.includes('architecture') ||
      input.includes('implementation') ||
      input.includes('complexity')
    ) {
      return 'tech-lead';
    } else if (
      input.includes('sprint') ||
      input.includes('scrum') ||
      input.includes('process') ||
      input.includes('timeline') ||
      input.includes('blocker')
    ) {
      return 'scrum-master';
    } else if (
      input.includes('done') ||
      input.includes('complete') ||
      input.includes('criteria') ||
      input.includes('definition of done')
    ) {
      return 'dod';
    } else if (
      input.includes('ready') ||
      input.includes('requirements') ||
      input.includes('story') ||
      input.includes('definition of ready')
    ) {
      return 'dor';
    } else if (
      input.includes('review') ||
      input.includes('usability') ||
      input.includes('accessibility')
    ) {
      return 'ux-reviewer';
    } else if (input.includes('analyze') || input.includes('analysis')) {
      // For general analysis, use system agent to provide collaborative overview
      return 'system';
    }
    return 'system';
  }

  private getFallbackResponse(
    agentType: string,
    userInput: string,
    selectedTicket: any,
  ): AgentResponse {
    if (!selectedTicket) {
      return {
        content: `I'm ready to help you groom tickets! You can either select a ticket from the sidebar or describe what you'd like to work on. My team of specialized agents (Design, QA, Tech Lead, Scrum Master, DoD, and DoR) are standing by to provide their expert analysis.\n\nTry asking something like:\n• "Analyze this ticket"\n• "What design considerations should we have?"\n• "What test cases do we need?"\n• "Is this ready for development?"`,
        agentType: 'system',
      };
    }

    // Provide a basic fallback analysis
    return {
      content: `I'm analyzing ticket **${selectedTicket.id}: ${selectedTicket.title}**\n\nThis ${selectedTicket.priority.toLowerCase()} priority ticket appears to be well-structured. For more detailed analysis, try asking specific questions like:\n\n• "What design considerations should we have?"\n• "What test cases do we need?"\n• "Is this technically feasible?"\n• "Is this ready for development?"\n\nI'm currently having trouble connecting to my AI analysis engine, but I can still provide basic guidance.`,
      agentType: agentType,
    };
  }
}

export const agentResponses = new AgentResponseService();
