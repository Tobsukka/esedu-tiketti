import { ChatOpenAI } from "@langchain/openai";
import { TICKET_GENERATOR_PROMPT } from "../prompts/ticketGeneratorPrompt.js";
import CONVERSATION_PROMPT from "../prompts/conversationPrompt.js";
import SOLUTION_GENERATOR_PROMPT from "../prompts/solutionGeneratorPrompt.js";
import { AI_CONFIG } from "../config.js";
import { PrismaClient, Priority, ResponseFormat } from '@prisma/client';
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";

// Create Prisma client
const prisma = new PrismaClient();

// Define the response format enum values as a tuple to satisfy zod's type requirements
const responseFormatEnum = AI_CONFIG.trainingTickets.responseFormats as [string, ...string[]];

// Define the output schema for our ticket generator
const ticketOutputSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(AI_CONFIG.trainingTickets.maxDescriptionLength),
  device: z.string().max(100),
  additionalInfo: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  responseFormat: z.enum(responseFormatEnum),
});

// Create structured parser for the output
const outputParser = StructuredOutputParser.fromZodSchema(ticketOutputSchema);

// Define the interface for the return type of generateTicket
interface GeneratedTicket {
  title: string;
  description: string;
  device: string;
  additionalInfo: string;
  priority: Priority;
  responseFormat: ResponseFormat;
  userProfile: string;
  categoryId: string;
  createdById: string;
  assignedToId: string | null;
}

/**
 * Interface for the comment object used in conversations
 */
interface CommentData {
  id: string;
  text: string;
  userId: string;
  ticketId: string;
  createdAt: Date;
}

/**
 * Interface for the parameters used to generate user responses
 */
interface UserResponseParams {
  ticket: {
    id: string;
    title: string;
    description: string;
    device: string;
    priority: string;
    categoryId: string;
    userProfile?: string;
    createdById: string;
  };
  comments: CommentData[];
  newSupportComment: string;
  supportUserId: string;
  solution?: string | null;
}

/**
 * Ticket Generator Agent that creates realistic IT support tickets for training
 * and simulates user responses in conversations
 */
export class TicketGeneratorAgent {
  private model: ChatOpenAI;
  
  constructor() {
    // Initialize the language model
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      modelName: AI_CONFIG.openai.chatModel,
      temperature: AI_CONFIG.openai.temperature,
    });
  }

  /**
   * Generates a realistic IT support ticket based on parameters
   */
  async generateTicket(params: {
    complexity?: string;
    category?: string;
    userProfile?: string;
    assignToId?: string; // Optional: Assign ticket to a specific support person
    responseFormat?: string; // Optional: Specify the desired response format
  }): Promise<GeneratedTicket> {
    console.log('TicketGeneratorAgent: generateTicket called with params:', JSON.stringify(params, null, 2)); // DEBUG LOG
    try {
      // Set default values if not provided
      const complexity = params.complexity || 'moderate';
      const category = params.category || 'Tekniset ongelmat';
      const userProfile = params.userProfile || 'student';
      const userProvidedResponseFormat = params.responseFormat; // Store to use later
      
      console.log('TicketGeneratorAgent: Using effective parameters:', { // DEBUG LOG
        complexity, 
        category, 
        userProfile,
        responseFormat: userProvidedResponseFormat 
      });
      
      // Ensure all required prompt variables are provided and valid
      if (!complexity || !category || !userProfile) {
        console.error('TicketGeneratorAgent: Missing required parameters', { complexity, category, userProfile }); // DEBUG LOG
        throw new Error('Missing required parameters for ticket generation');
      }
      
      // Validate complexity is one of the allowed values
      if (!AI_CONFIG.trainingTickets.complexityLevels.includes(complexity)) {
        console.error('TicketGeneratorAgent: Invalid complexity level:', complexity); // DEBUG LOG
        throw new Error(`Invalid complexity level. Must be one of: ${AI_CONFIG.trainingTickets.complexityLevels.join(', ')}`);
      }
      
      // Validate responseFormat if provided
      if (userProvidedResponseFormat && !AI_CONFIG.trainingTickets.responseFormats.includes(userProvidedResponseFormat)) {
        console.error('TicketGeneratorAgent: Invalid response format:', userProvidedResponseFormat); // DEBUG LOG
        throw new Error(`Invalid response format. Must be one of: ${AI_CONFIG.trainingTickets.responseFormats.join(', ')}`);
      }
      
      // Find the category - either by ID (if UUID) or by name
      let categoryRecord;
      
      // Check if the category parameter looks like a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      
      if (isUuid) {
        // If it's a UUID, find by ID
        console.log('TicketGeneratorAgent: Looking up category by ID:', category); // DEBUG LOG
        categoryRecord = await prisma.category.findUnique({
          where: {
            id: category
          },
        });
      } else {
        // Otherwise, find by name (original behavior)
        console.log('TicketGeneratorAgent: Looking up category by name:', category); // DEBUG LOG
        categoryRecord = await prisma.category.findFirst({
          where: {
            name: {
              contains: category,
              mode: 'insensitive',
            },
          },
        });
      }
      
      if (!categoryRecord) {
        console.error('TicketGeneratorAgent: Category not found:', category); // DEBUG LOG
        throw new Error(`Category "${category}" not found`);
      }
      
      // For prompt formatting, we need the actual category name
      const categoryName = categoryRecord.name;
      
      // Format the prompt with provided parameters
      const promptParams = { // DEBUG LOG
        complexity: complexity.trim(),
        category: categoryName.trim(), // Use the category name for the prompt
        userProfile: userProfile.trim(),
      };
      console.log('TicketGeneratorAgent: Formatting prompt with params:', JSON.stringify(promptParams, null, 2)); // DEBUG LOG
      const formattedMessages = await TICKET_GENERATOR_PROMPT.formatMessages(promptParams);
      
      console.log('TicketGeneratorAgent: Invoking LLM for ticket generation...'); // DEBUG LOG
      
      // Call the language model to generate ticket content
      const response = await this.model.invoke(formattedMessages);
      
      // Parse the response
      const outputInstructions = outputParser.getFormatInstructions();
      const rawTicketData = response.content;
      
      console.log('TicketGeneratorAgent: Received raw response from LLM:', rawTicketData.toString()); // DEBUG LOG
      
      // Extract the JSON data from the response
      let parsedTicketData;
      try {
        // Try to parse the entire response as JSON
        parsedTicketData = JSON.parse(rawTicketData.toString());
      } catch (e) {
        console.log('TicketGeneratorAgent: Failed to parse entire response as JSON, trying to extract JSON from text'); // DEBUG LOG
        // If that fails, try to extract JSON from the text
        const jsonMatch = rawTicketData.toString().match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedTicketData = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.error('TicketGeneratorAgent: Failed to parse extracted JSON:', jsonMatch[0], 'Error:', parseError); // DEBUG LOG
            throw new Error("Failed to parse extracted JSON from model output");
          }
        } else {
          console.error('TicketGeneratorAgent: Failed to extract JSON from response:', rawTicketData.toString()); // DEBUG LOG
          throw new Error("Failed to parse model output as JSON");
        }
      }
      
      console.log('TicketGeneratorAgent: Successfully parsed JSON from LLM response:', JSON.stringify(parsedTicketData, null, 2)); // DEBUG LOG
      
      // Find an admin user to create the ticket as
      const adminUser = await prisma.user.findFirst({
        where: { 
          role: 'ADMIN' 
        },
      });
      
      if (!adminUser) {
        console.error('TicketGeneratorAgent: No admin user found'); // DEBUG LOG
        throw new Error("No admin user found to create the training ticket");
      }
      
      // If priority not set or invalid, use default priority based on complexity
      if (!parsedTicketData.priority || 
          !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsedTicketData.priority)) {
        
        // Type-safe complexity check for defaultPriorities
        if (complexity === 'simple' || complexity === 'moderate' || complexity === 'complex') {
          parsedTicketData.priority = AI_CONFIG.trainingTickets.defaultPriorities[complexity];
          console.log(`TicketGeneratorAgent: Using default priority for ${complexity} complexity: ${parsedTicketData.priority}`); // DEBUG LOG
        } else {
          // Fallback to MEDIUM if complexity is not in defaultPriorities
          parsedTicketData.priority = 'MEDIUM';
          console.log(`TicketGeneratorAgent: Using fallback priority MEDIUM for unknown complexity: ${complexity}`); // DEBUG LOG
        }
      }
      
      // If user provided a responseFormat parameter, use it instead of the AI-generated one
      if (userProvidedResponseFormat) {
        console.log(`TicketGeneratorAgent: Overriding AI-generated response format with user-provided format: ${userProvidedResponseFormat}`); // DEBUG LOG
        parsedTicketData.responseFormat = userProvidedResponseFormat;
      } 
      // Otherwise ensure response format from AI is valid
      else if (!parsedTicketData.responseFormat || 
          !AI_CONFIG.trainingTickets.responseFormats.includes(parsedTicketData.responseFormat)) {
        // Default to TEKSTI if invalid
        parsedTicketData.responseFormat = 'TEKSTI';
        console.log(`TicketGeneratorAgent: Using default response format: ${parsedTicketData.responseFormat}`); // DEBUG LOG
      }
      
      // Trim description if it exceeds maxDescriptionLength
      if (parsedTicketData.description && 
          parsedTicketData.description.length > AI_CONFIG.trainingTickets.maxDescriptionLength) {
        parsedTicketData.description = parsedTicketData.description.substring(
          0, AI_CONFIG.trainingTickets.maxDescriptionLength
        );
        console.log(`TicketGeneratorAgent: Trimmed description to maximum length: ${AI_CONFIG.trainingTickets.maxDescriptionLength} chars`); // DEBUG LOG
      }
      
      // Ensure all fields are properly set
      const finalTicketData = { // DEBUG LOG
        title: parsedTicketData.title,
        description: parsedTicketData.description,
        device: parsedTicketData.device || '', // Ensure device is not null
        additionalInfo: parsedTicketData.additionalInfo || '', // Ensure additionalInfo is not null
        priority: parsedTicketData.priority as Priority,
        responseFormat: parsedTicketData.responseFormat as ResponseFormat,
        userProfile: userProfile,
        categoryId: categoryRecord.id,
        createdById: adminUser.id,
        assignedToId: params.assignToId || null,
      };
      console.log('TicketGeneratorAgent: Returning final ticket data:', JSON.stringify(finalTicketData, null, 2)); // DEBUG LOG
      return finalTicketData;

    } catch (error) {
      console.error('Error generating ticket:', error); // DEBUG LOG
      throw new Error(`Failed to generate ticket: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generates a user response to a support comment in a ticket conversation
   * This simulates how a real user would respond to troubleshooting instructions
   */
  async generateUserResponse(params: UserResponseParams): Promise<string> {
    try {
      const { 
        ticket, 
        comments, 
        newSupportComment, 
        supportUserId,
        solution
      } = params;
      
      console.log(`Generating user response for ticket: ${ticket.id}, to support comment by user: ${supportUserId}`);
      
      // Get category name
      const category = await prisma.category.findUnique({
        where: { id: ticket.categoryId }
      });
      
      if (!category) {
        throw new Error(`Category not found for ticket ${ticket.id}`);
      }
      
      // Get user name who created the ticket
      const ticketCreator = await prisma.user.findUnique({
        where: { id: ticket.createdById }
      });
      
      if (!ticketCreator) {
        throw new Error(`Creator not found for ticket ${ticket.id}`);
      }
      
      // Format conversation history for the prompt
      const conversationHistory = comments.map(comment => {
        const isSupport = comment.userId !== ticket.createdById;
        return {
          role: isSupport ? "support" : "user",
          name: isSupport ? "Support" : ticketCreator.name,
          content: comment.text,
          timestamp: comment.createdAt.toISOString()
        };
      });
      
      // Determine complexity from priority
      const complexity = 
        ticket.priority === 'LOW' ? 'simple' : 
        ticket.priority === 'MEDIUM' ? 'moderate' : 
        ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'complex' : 'moderate';
      
      // Estimate solution progress based on support comment
      const progressToSolution = this.estimateSolutionProgress(
        newSupportComment, 
        solution || '', 
        conversationHistory
      );
      
      // Format the prompt for conversation
      const formattedMessages = await CONVERSATION_PROMPT.formatMessages({
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        deviceInfo: ticket.device || 'Unknown device',
        category: category.name,
        userName: ticketCreator.name,
        userProfile: ticket.userProfile || 'student',
        solution: solution || 'Unknown solution',
        conversationHistory: JSON.stringify(conversationHistory),
        supportComment: newSupportComment,
        complexity,
        progressToSolution,
        "complexity === 'simple' ? 'vähäinen' : complexity === 'moderate' ? 'keskitasoinen' : 'hyvä'": 
          `${complexity === 'simple' ? 'vähäinen' : complexity === 'moderate' ? 'keskitasoinen' : 'hyvä'}`
      });
      
      console.log('Invoking LLM for user response generation');
      
      // Get AI response simulating the user
      const response = await this.model.invoke(formattedMessages);
      const userResponse = response.content.toString();
      
      console.log('Generated user response successfully');
      
      return userResponse;
    } catch (error) {
      console.error('Error generating user response:', error);
      // Return a generic fallback response if something goes wrong
      return "Pahoittelut, en aivan ymmärtänyt ohjeita. Voisitko selittää vielä kerran?";
    }
  }
  
  /**
   * Generates a solution and detailed troubleshooting guide for a ticket
   * This becomes the hidden solution that the AI agent knows but doesn't reveal
   */
  async generateSolution(ticketId: string): Promise<string> {
    try {
      // Get the ticket data
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { category: true }
      });
      
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} not found`);
      }
      
      // Format the solution prompt with ticket data
      const formattedMessages = await SOLUTION_GENERATOR_PROMPT.formatMessages({
        title: ticket.title,
        description: ticket.description,
        device: ticket.device || 'Ei määritelty',
        category: ticket.category.name,
      });
      
      console.log('Using formatted prompt for solution generation');
      
      // Get solution from LLM
      const response = await this.model.invoke(formattedMessages);
      
      return response.content.toString();
    } catch (error) {
      console.error('Error generating solution:', error);
      return "Ratkaisun luominen epäonnistui.";
    }
  }
  
  /**
   * Helper method to estimate how close the support agent is to solving the problem
   * This helps the AI know how to respond appropriately
   */
  private estimateSolutionProgress(
    currentComment: string,
    solution: string,
    history: any[]
  ): string {
    if (!solution) return "UNKNOWN";
    
    // Extract key solution terms
    const solutionKeywords = this.extractKeyTerms(solution);
    
    // Check current comment and history for matches
    const allComments = history.map(h => h.content).join(" ") + " " + currentComment;
    const matchCount = solutionKeywords.filter(keyword => 
      allComments.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    // Calculate approximate progress
    const progressPercent = Math.min(
      100, 
      Math.round((matchCount / Math.max(1, solutionKeywords.length)) * 100)
    );
    
    console.log(`Solution progress: ${progressPercent}% (matched ${matchCount}/${solutionKeywords.length} keywords)`);
    
    // Return progress category
    if (progressPercent < 25) return "EARLY";
    if (progressPercent < 60) return "PROGRESSING";
    if (progressPercent < 90) return "CLOSE";
    return "SOLVED";
  }
  
  /**
   * Extract important terms from solution text
   */
  private extractKeyTerms(solution: string): string[] {
    // Split solution into words, remove duplicates and common words
    const words = solution.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // Skip short words
      .filter(word => !['joka', 'että', 'tämä', 'niin', 'kuin', 'voit', 'olla', 'myös'].includes(word));
    
    // Remove duplicates and limit number of terms
    const uniqueWords = [...new Set(words)].slice(0, 20);
    
    // Extract phrases (2-3 words) that might be important
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 3 && words[i+1].length > 3) {
        phrases.push(`${words[i]} ${words[i+1]}`);
      }
    }
    
    // Combine single words and phrases, ensuring no duplicates
    const terms = [...uniqueWords, ...phrases.slice(0, 10)];
    
    return terms;
  }
}

// Create a singleton instance
export const ticketGenerator = new TicketGeneratorAgent(); 