export interface AgentMetadata {
    description?: any;
    key: string;
    color: string;
    displayName: string;
}

export const AGENT_METADATA: Record<string, AgentMetadata> = {
    'AI Agent': {
        key: 'AI',
        color: '#6B7280',
        displayName: 'AI Agent',
    },
    'Project Management Agent': {
        key: 'PM',
        color: '#BF4040',
        displayName: 'Project Management Agent',
    },
    'Product Strategy Agent': {
        key: 'PD',
        color: '#BF6A40',
        displayName: 'Product Strategy Agent',
    },
    'Business Agent': {
        key: 'BA',
        color: '#BF9540',
        displayName: 'Business Agent',
    },
    'Frontend Agent': {
        key: 'FED',
        color: '#BFBF40',
        displayName: 'Frontend Agent',
    },
    'Metrics Agent': {
        key: 'MA',
        color: '#95BF40',
        displayName: 'Metrics Agent',
    },
    'Testing Agent': {
        key: 'TS',
        color: '#6ABF40',
        displayName: 'Testing Agent',
    },
    'Risk Agent': {
        key: 'RK',
        color: '#40BF40',
        displayName: 'Risk Agent',
    },
    'KPI Agent': {
        key: 'KP',
        color: '#40BF6A',
        displayName: 'KPI Agent',
    },
    'User Experience Agent': {
        key: 'UX',
        color: '#40BF95',
        displayName: 'User Experience Agent',
    },
    'Architecture Agent': {
        key: 'AQ',
        color: '#40BFBF',
        displayName: 'Architecture Agent',
    },
    'User Interface Agent': {
        key: 'UI',
        color: '#4095BF',
        displayName: 'User Interface Agent',
    },
    'Agile Agent': {
        key: 'AG',
        color: '#406ABF',
        displayName: 'Agile Agent',
    },
    'Quality Engineering Agent': {
        key: 'QA',
        color: '#4040BF',
        displayName: 'Quality Engineering Agent',
    },
    'Backend Agent': {
        key: 'BED',
        color: '#BF4040',
        displayName: 'Backend Agent',
    },
    'Design System Agent': {
        key: 'DS',
        color: '#9540BF',
        displayName: 'Design System Agent',
    },
    'Marketing Agent': {
        key: 'MK',
        color: '#BF40BF',
        displayName: 'Marketing Agent',
    },
    'Content Agent': {
        key: 'CA',
        color: '#BF4095',
        displayName: 'Content Agent',
    },
    'Evaluation Agent': {
        key: 'EA',
        color: '#BF406A',
        displayName: 'Evaluation Agent',
    },
};


export const getAgentMetadata = (agentName: string): AgentMetadata => {
    const metadata = AGENT_METADATA[agentName];

    if (metadata) {
        return metadata;
    }

    const words = agentName.trim().split(/\s+/);
    const key = words
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 3);

    return {
        key: key || 'AG',
        color: '#6366f1',
        displayName: agentName,
    };
};

export const getKnownAgentNames = (): string[] => {
    return Object.keys(AGENT_METADATA);
};
