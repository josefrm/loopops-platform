interface CompanyDocument {
  id: string;
  name: string;
  type: 'policy' | 'guideline' | 'template' | 'process';
  description: string;
  content: string;
  uploadedAt: Date;
  tags: string[];
}

interface RAGContext {
  relevantDocuments: CompanyDocument[];
  contextSummary: string;
}

class RAGService {
  private documents: CompanyDocument[] = [];

  updateDocuments(documents: CompanyDocument[]) {
    this.documents = documents;
  }

  // Simple text similarity search (in a real implementation, you'd use vector embeddings)
  private calculateRelevance(query: string, document: CompanyDocument): number {
    const queryLower = query.toLowerCase();
    const documentText = `${document.name} ${document.description} ${
      document.content
    } ${document.tags.join(' ')}`.toLowerCase();

    // Simple keyword matching score
    const queryWords = queryLower.split(' ').filter((word) => word.length > 2);
    let score = 0;

    queryWords.forEach((word) => {
      if (documentText.includes(word)) {
        score += 1;
        // Boost score for matches in name or tags
        if (
          document.name.toLowerCase().includes(word) ||
          document.tags.some((tag) => tag.toLowerCase().includes(word))
        ) {
          score += 2;
        }
      }
    });

    return score;
  }

  findRelevantDocuments(
    query: string,
    maxResults: number = 3,
  ): CompanyDocument[] {
    if (!this.documents.length) return [];

    const scoredDocs = this.documents
      .map((doc) => ({
        document: doc,
        score: this.calculateRelevance(query, doc),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((item) => item.document);

    return scoredDocs;
  }

  generateRAGContext(userInput: string, agentType: string): RAGContext {
    // Find documents relevant to the user's query and agent type
    const queryWithAgentContext = `${userInput} ${agentType}`;
    const relevantDocuments = this.findRelevantDocuments(
      queryWithAgentContext,
      3,
    );

    if (relevantDocuments.length === 0) {
      return {
        relevantDocuments: [],
        contextSummary: '',
      };
    }

    // Generate a context summary
    const contextSummary = this.generateContextSummary(relevantDocuments);

    return {
      relevantDocuments,
      contextSummary,
    };
  }

  private generateContextSummary(documents: CompanyDocument[]): string {
    const docSummaries = documents
      .map((doc) => {
        const snippet = doc.content.substring(0, 200) + '...';
        return `**${doc.name}** (${doc.type}): ${snippet}`;
      })
      .join('\n\n');

    return `Based on company documentation:\n\n${docSummaries}`;
  }

  // Get agent-specific document recommendations
  getAgentRelevantDocs(agentType: string): CompanyDocument[] {
    const agentKeywords: Record<string, string[]> = {
      design: ['design', 'ui', 'ux', 'wireframe', 'mockup', 'style', 'brand'],
      'ux-reviewer': [
        'usability',
        'accessibility',
        'user',
        'research',
        'testing',
        'persona',
      ],
      qa: ['test', 'quality', 'bug', 'defect', 'acceptance', 'criteria'],
      'tech-lead': [
        'architecture',
        'technical',
        'estimate',
        'complexity',
        'feasibility',
      ],
      'scrum-master': [
        'sprint',
        'scrum',
        'agile',
        'process',
        'planning',
        'ceremony',
      ],
      dod: ['done', 'completion', 'criteria', 'quality', 'deliverable'],
      dor: ['ready', 'requirements', 'acceptance', 'criteria', 'story'],
    };

    const keywords = agentKeywords[agentType] || [];
    const query = keywords.join(' ');

    return this.findRelevantDocuments(query, 2);
  }
}

export const ragService = new RAGService();
