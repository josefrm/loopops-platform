interface AgentPrompt {
  id: string;
  name: string;
  prompt: string;
  status?: 'active' | 'inactive';
  isCustom?: boolean;
}

const defaultPrompts: Record<string, string> = {
  design: `You are a Design Agent specializing in UI/UX design for JIRA tickets. Analyze the ticket and provide specific design recommendations including wireframes, user flows, accessibility considerations, and visual hierarchy. Be practical and actionable.`,

  'ux-reviewer': `You are a UX Reviewer Agent focusing on user experience and usability. Evaluate the ticket for user journey, accessibility compliance, error states, and overall user experience. Provide specific recommendations for improving usability.`,

  qa: `You are a QA Agent responsible for quality assurance and testing. Analyze the ticket to create comprehensive test cases, identify edge cases, suggest automation opportunities, and define quality gates. Be thorough and systematic.`,

  'tech-lead': `You are a Tech Lead Agent providing technical guidance. Assess the technical complexity, suggest implementation approaches, identify potential risks, estimate effort accurately, and recommend architecture decisions. Be realistic about technical challenges.`,

  'scrum-master': `You are a Scrum Master Agent focused on agile processes and team coordination. Evaluate sprint readiness, identify potential blockers, assess story sizing, and provide process recommendations. Consider team dynamics and sprint goals.`,

  dod: `You are a Definition of Done Agent ensuring completion criteria are clear. Define comprehensive completion criteria, quality gates, acceptance criteria validation, and deliverable standards. Be specific about what "done" means.`,

  dor: `You are a Definition of Ready Agent ensuring tickets are ready for development. Assess requirement clarity, acceptance criteria completeness, dependency identification, and development readiness. Provide a readiness score and specific gaps.`,

  system: `You are TicketGenie, an AI-powered ticket grooming assistant. You coordinate a team of specialized AI agents to help improve JIRA tickets. Provide collaborative analysis and guide users to ask specific questions to specialized agents.`,
};

class AgentPromptService {
  private prompts: Record<string, string>;
  private agentStatuses: Record<string, 'active' | 'inactive'>;
  private customAgents: Record<string, AgentPrompt>;

  constructor() {
    // Load prompts from localStorage or use defaults
    const savedPrompts = localStorage.getItem('agentPrompts');
    this.prompts = savedPrompts
      ? JSON.parse(savedPrompts)
      : { ...defaultPrompts };

    // Load agent statuses from localStorage
    const savedStatuses = localStorage.getItem('agentStatuses');
    this.agentStatuses = savedStatuses ? JSON.parse(savedStatuses) : {};

    // Load custom agents from localStorage
    const savedCustomAgents = localStorage.getItem('customAgents');
    this.customAgents = savedCustomAgents ? JSON.parse(savedCustomAgents) : {};
  }

  getPrompt(agentId: string): string {
    if (this.customAgents[agentId]) {
      return this.customAgents[agentId].prompt;
    }
    return this.prompts[agentId] || defaultPrompts[agentId] || '';
  }

  updatePrompt(agentId: string, newPrompt: string): void {
    if (this.customAgents[agentId]) {
      this.customAgents[agentId].prompt = newPrompt;
      localStorage.setItem('customAgents', JSON.stringify(this.customAgents));
    } else {
      this.prompts[agentId] = newPrompt;
      localStorage.setItem('agentPrompts', JSON.stringify(this.prompts));
    }
  }

  getAllPrompts(): AgentPrompt[] {
    const defaultAgents = Object.entries(this.prompts).map(([id, prompt]) => ({
      id,
      name: this.getAgentName(id),
      prompt,
      status: this.agentStatuses[id] || 'active',
      isCustom: false,
    }));

    const customAgentsList = Object.values(this.customAgents).map((agent) => ({
      ...agent,
      status: this.agentStatuses[agent.id] || 'active',
    }));

    return [...defaultAgents, ...customAgentsList];
  }

  getAgentStatus(agentId: string): 'active' | 'inactive' {
    return this.agentStatuses[agentId] || 'active';
  }

  toggleAgentStatus(agentId: string): void {
    const currentStatus = this.getAgentStatus(agentId);
    this.agentStatuses[agentId] =
      currentStatus === 'active' ? 'inactive' : 'active';
    localStorage.setItem('agentStatuses', JSON.stringify(this.agentStatuses));
  }

  addCustomAgent(name: string, prompt: string): string {
    const id = `custom-${Date.now()}`;
    this.customAgents[id] = {
      id,
      name,
      prompt,
      isCustom: true,
    };
    localStorage.setItem('customAgents', JSON.stringify(this.customAgents));
    return id;
  }

  deleteCustomAgent(agentId: string): void {
    if (this.customAgents[agentId]) {
      delete this.customAgents[agentId];
      delete this.agentStatuses[agentId];
      localStorage.setItem('customAgents', JSON.stringify(this.customAgents));
      localStorage.setItem('agentStatuses', JSON.stringify(this.agentStatuses));
    }
  }

  resetToDefault(agentId: string): void {
    if (this.customAgents[agentId]) {
      // For custom agents, delete them entirely
      this.deleteCustomAgent(agentId);
    } else {
      // For default agents, reset to default prompt
      this.prompts[agentId] = defaultPrompts[agentId];
      localStorage.setItem('agentPrompts', JSON.stringify(this.prompts));
    }
  }

  private getAgentName(agentId: string): string {
    const nameMap: Record<string, string> = {
      design: 'Design Agent',
      'ux-reviewer': 'UX Reviewer',
      qa: 'QA Agent',
      'tech-lead': 'Tech Lead Agent',
      'scrum-master': 'Scrum Master Agent',
      dod: 'Definition of Done Agent',
      dor: 'Definition of Ready Agent',
      system: 'TicketGenie System',
    };
    return nameMap[agentId] || 'Unknown Agent';
  }
}

export const agentPromptService = new AgentPromptService();
