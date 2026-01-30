export interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  storyPoints: number;
  description: string;
  acceptanceCriteria: string[];
  estimatedHours: number;
  labels: string[];
  project: string;
  issueType: string;
  // Additional metadata fields
  sprint?: string;
  startDate?: string;
  endDate?: string;
  informer?: string;
  created?: string;
  updated?: string;
  started?: string;
  team?: string;
  linkedIssues?: string[];
  // Rich data fields from expanded ticket endpoint
  renderedFields?: {
    description?: string;
    [key: string]: any;
  };
  names?: { [key: string]: string };
  schema?: { [key: string]: any };
  operations?: any[];
  fields?: {
    summary?: string;
    description?: any;
    status?: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string };
    issuetype?: { name: string };
    labels?: string[];
    [key: string]: any;
  };
}
