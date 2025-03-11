/**
 * Support Agent Types
 * 
 * This file defines the types used in the support team AI agent.
 */

// Define comment type
interface CommentWithUser {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
  };
}

// Agent state
export interface AgentState {
  // Input from the support person
  userQuery: string;
  
  // Ticket information
  ticketId?: string;
  ticketTitle?: string;
  ticketDescription?: string;
  ticketCategory?: string;
  ticketPriority?: string;
  ticketStatus?: string;
  ticketComments?: CommentWithUser[];
  
  // Agent working memory
  thought?: string;
  relevantTickets?: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
  relevantKnowledge?: string[];
  
  // Agent output
  suggestedSolution?: string;
  suggestedResponse?: string;
  nextSteps?: string[];
  analysisResult?: TicketAnalysis;
  
  // Control flow
  error?: string;
}

// Ticket analysis result
export interface TicketAnalysis {
  // Problem analysis
  problemCategory: string;
  problemComplexity: 'Simple' | 'Moderate' | 'Complex';
  estimatedTimeToResolve: string;
  
  // Key insights
  keyInsights: string[];
  possibleCauses: string[];
  
  // Required information
  missingInformation: string[];
  
  // Recommended approach
  recommendedApproach: string;
  potentialSolutions: string[];
}

// Agent tool output types
export interface AnalyzeTicketOutput {
  analysis: TicketAnalysis;
}

export interface FindSimilarTicketsOutput {
  tickets: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
}

export interface GenerateResponseOutput {
  responseText: string;
  nextStepsRecommendation: string[];
}

export interface RetrieveKnowledgeOutput {
  relevantInformation: string[];
}

// Agent action names
export enum AgentAction {
  ANALYZE_TICKET = 'analyze_ticket',
  FIND_SIMILAR_TICKETS = 'find_similar_tickets',
  RETRIEVE_KNOWLEDGE = 'retrieve_knowledge',
  GENERATE_RESPONSE = 'generate_response',
  FINISH = 'finish',
} 