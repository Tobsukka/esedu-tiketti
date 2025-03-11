/**
 * Support Agent Tools
 * 
 * This file defines the tools used by the support team AI agent.
 * These tools allow the agent to interact with the system and provide
 * useful capabilities for ticket resolution.
 */

import { Tool } from '@langchain/core/tools';
import { 
  AgentState, 
  AnalyzeTicketOutput, 
  FindSimilarTicketsOutput,
  GenerateResponseOutput,
  RetrieveKnowledgeOutput
} from './supportAgentTypes.js';
import { generateStructuredResponse } from '../llm/llmService.js';
import { findSimilarTicketsForTicket } from '../ticketAIService.js';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';

/**
 * Tool to analyze a ticket and provide insights
 */
export class AnalyzeTicketTool extends Tool {
  name = 'analyze_ticket';
  description = 'Analyzes a ticket to identify the problem, complexity, and potential solutions';

  constructor() {
    super();
  }

  protected async _call(
    arg: string,
    runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    try {
      // In a real implementation, we would extract the ticket state from arg or context
      // For now, we'll use a mock ticket for demonstration
      const mockTicket = {
        title: "Can't access email",
        description: "I've been unable to access my email since yesterday. When I try to log in, it says my password is incorrect, but I'm sure I'm using the right password.",
        category: "Email",
        status: "OPEN",
        priority: "HIGH",
      };

      const prompt = `
        Analyze the following IT support ticket:
        
        Title: ${mockTicket.title}
        Description: ${mockTicket.description}
        Category: ${mockTicket.category || 'Not specified'}
        Status: ${mockTicket.status || 'Not specified'}
        Priority: ${mockTicket.priority || 'Not specified'}
        
        Provide a comprehensive analysis including problem categorization, complexity assessment,
        time estimation, key insights, possible causes, missing information, and recommended approach.
      `;

      const instructions = `
        You are an expert IT support analyst. Analyze the ticket and return a JSON object with the following properties:
        - problemCategory: a specific technical category for the issue
        - problemComplexity: one of "Simple", "Moderate", or "Complex"
        - estimatedTimeToResolve: a human-readable time estimate
        - keyInsights: array of 2-4 key observations about the problem
        - possibleCauses: array of 2-4 potential causes
        - missingInformation: array of any additional information needed to solve the problem
        - recommendedApproach: a brief strategy for solving the problem
        - potentialSolutions: array of 2-3 potential solutions
      `;

      const analysis = await generateStructuredResponse<AnalyzeTicketOutput>(
        prompt,
        instructions,
        'advanced'
      );

      return JSON.stringify(analysis);
    } catch (error) {
      console.error('Error analyzing ticket:', error);
      return JSON.stringify({ error: 'Failed to analyze ticket' });
    }
  }
}

/**
 * Tool to find similar tickets
 */
export class FindSimilarTicketsTool extends Tool {
  name = 'find_similar_tickets';
  description = 'Finds similar tickets to help with resolution';

  constructor() {
    super();
  }

  protected async _call(
    arg: string,
    runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    try {
      // In a real implementation, we would extract the ticket info from arg
      // For now, we'll use a mock ticket
      const mockTicket = {
        title: "Can't access email",
        description: "I've been unable to access my email since yesterday. When I try to log in, it says my password is incorrect, but I'm sure I'm using the right password.",
        category: { name: "Email" },
      };

      const similarTickets = await findSimilarTicketsForTicket(mockTicket);
      
      // Format the output
      const result: FindSimilarTicketsOutput = {
        tickets: similarTickets.map(t => ({
          id: t.ticketId,
          title: 'Similar ticket', // We'll need to fetch the actual titles
          similarity: t.similarity,
        })),
      };

      return JSON.stringify(result);
    } catch (error) {
      console.error('Error finding similar tickets:', error);
      return JSON.stringify({ error: 'Failed to find similar tickets' });
    }
  }
}

/**
 * Tool to retrieve knowledge
 */
export class RetrieveKnowledgeTool extends Tool {
  name = 'retrieve_knowledge';
  description = 'Retrieves relevant knowledge and documentation';

  constructor() {
    super();
  }

  protected async _call(
    arg: string,
    runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    // In a real implementation, this would search a knowledge base
    // For now, we'll simulate with a basic response
    const result: RetrieveKnowledgeOutput = {
      relevantInformation: [
        'This is a placeholder for knowledge retrieval. In a full implementation, this would search documentation, knowledge bases, and previous solutions.',
        'The knowledge retrieval system will be connected to documentation and internal knowledge bases.',
      ],
    };

    return JSON.stringify(result);
  }
}

/**
 * Tool to generate support response
 */
export class GenerateResponseTool extends Tool {
  name = 'generate_response';
  description = 'Generates a support response to the ticket';

  constructor() {
    super();
  }

  protected async _call(
    arg: string,
    runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    try {
      // In a real implementation, we'd use state from agent context
      // For now, we'll use mock data
      const mockTicket = {
        title: "Can't access email",
        description: "I've been unable to access my email since yesterday. When I try to log in, it says my password is incorrect, but I'm sure I'm using the right password.",
        category: "Email",
      };
      
      const mockAnalysis = {
        problemCategory: "Authentication Issue",
        problemComplexity: "Simple" as const,
        possibleCauses: ["Password expired", "Account locked", "Typo in password"],
        recommendedApproach: "Verify account status and reset password"
      };
      
      // Prepare prompt for generating response
      const prompt = `
        Generate a professional support response for the following ticket:
        
        Title: ${mockTicket.title}
        Description: ${mockTicket.description}
        Category: ${mockTicket.category || 'Not specified'}
        
        Based on analysis:
        - Problem: ${mockAnalysis.problemCategory}
        - Complexity: ${mockAnalysis.problemComplexity}
        - Possible causes: ${mockAnalysis.possibleCauses.join(', ')}
        - Recommended approach: ${mockAnalysis.recommendedApproach}
        
        Also suggest next steps or additional information needed.
      `;

      const instructions = `
        You are a helpful IT support professional. Write a professional, empathetic response
        that addresses the user's issue. Include:
        1. A greeting and acknowledgment of the issue
        2. A clear explanation of what you understand the problem to be
        3. Initial troubleshooting steps or a solution if possible
        4. Next steps or additional information needed
        
        Return a JSON object with:
        - responseText: the complete response to the user
        - nextStepsRecommendation: array of 2-3 next steps for the support agent to take
      `;

      const response = await generateStructuredResponse<GenerateResponseOutput>(
        prompt,
        instructions
      );

      return JSON.stringify(response);
    } catch (error) {
      console.error('Error generating response:', error);
      return JSON.stringify({ error: 'Failed to generate response' });
    }
  }
}

// Export all tools
export const supportAgentTools = [
  new AnalyzeTicketTool(),
  new FindSimilarTicketsTool(),
  new RetrieveKnowledgeTool(),
  new GenerateResponseTool(),
]; 