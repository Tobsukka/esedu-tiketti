/**
 * Ticket AI Service
 * 
 * This service integrates AI capabilities with tickets, including:
 * - Automatic embedding generation for tickets
 * - Similarity search for tickets
 * - AI-powered analysis and suggestions
 */

import { embedTicket } from './embeddings/embeddingService.js';
import { storeTicketEmbedding, findSimilarTickets, searchTicketsByText, deleteTicketEmbedding } from './vectorstore/pgVectorStore.js';
import { AI_CONFIG } from './config.js';

/**
 * Process a new or updated ticket for AI features
 * @param ticket - The ticket to process
 * @returns Promise resolving to true if successful
 */
export async function processTicket(ticket: {
  id: string;
  title: string;
  description: string;
  category?: { name?: string; id: string };
  device?: string;
  additionalInfo?: string;
}): Promise<boolean> {
  try {
    console.log(`Processing ticket ${ticket.id} for AI features`);
    
    // Generate embedding for the ticket
    const embedding = await embedTicket({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      device: ticket.device,
      additionalInfo: ticket.additionalInfo,
    });
    
    // Store the embedding in the vector database
    await storeTicketEmbedding(ticket.id, embedding);
    
    return true;
  } catch (error) {
    console.error(`Error processing ticket ${ticket.id} for AI:`, error);
    return false;
  }
}

/**
 * Handle ticket deletion
 * @param ticketId - ID of the deleted ticket
 * @returns Promise resolving to true if successful
 */
export async function handleTicketDeletion(ticketId: string): Promise<boolean> {
  try {
    // Delete the ticket embedding from the vector database
    await deleteTicketEmbedding(ticketId);
    return true;
  } catch (error) {
    console.error(`Error handling deletion of ticket ${ticketId}:`, error);
    return false;
  }
}

/**
 * Find similar tickets by content
 * @param ticket - The ticket to find similar tickets for
 * @param limit - Maximum number of similar tickets to return
 * @returns Promise resolving to array of similar ticket IDs with similarity scores
 */
export async function findSimilarTicketsForTicket(
  ticket: {
    title: string;
    description: string;
    category?: { name?: string };
    device?: string;
    additionalInfo?: string;
  },
  limit: number = AI_CONFIG.similaritySearch.maxResults
): Promise<Array<{ ticketId: string; similarity: number }>> {
  try {
    // Generate embedding for the ticket (without storing it)
    const embedding = await embedTicket(ticket);
    
    // Find similar tickets
    return await findSimilarTickets(embedding, limit);
  } catch (error) {
    console.error('Error finding similar tickets:', error);
    throw new Error('Failed to find similar tickets');
  }
}

/**
 * Search tickets by text query
 * @param query - Text query to search for
 * @param limit - Maximum number of results to return
 * @returns Promise resolving to array of ticket IDs with similarity scores
 */
export async function searchTickets(
  query: string,
  limit: number = AI_CONFIG.similaritySearch.maxResults
): Promise<Array<{ ticketId: string; similarity: number }>> {
  try {
    return await searchTicketsByText(query, limit);
  } catch (error) {
    console.error('Error searching tickets:', error);
    throw new Error('Failed to search tickets');
  }
} 