/**
 * Embedding Service
 * 
 * This service is responsible for generating embeddings for text data
 * using OpenAI's embedding models. It provides functions to embed
 * ticket data and query text.
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { AI_CONFIG } from '../config.js';

// Configure OpenAI embeddings using environment variables
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: AI_CONFIG.llm.openai.apiKey,
  modelName: AI_CONFIG.llm.openai.embeddingModel,
  dimensions: AI_CONFIG.vectorDb.postgres.dimension,
  stripNewLines: true,
});

/**
 * Generate embedding for a single text
 * @param text - Text to embed
 * @returns Promise resolving to an embedding vector
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    return await embeddings.embedQuery(text);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding for text');
  }
}

/**
 * Generate embeddings for multiple texts
 * @param texts - Array of texts to embed
 * @returns Promise resolving to an array of embedding vectors
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  try {
    return await embeddings.embedDocuments(texts);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings for texts');
  }
}

/**
 * Generate embedding for a ticket
 * @param ticket - Ticket data
 * @returns Promise resolving to an embedding vector
 */
export async function embedTicket(ticket: {
  title: string;
  description: string;
  category?: { name?: string };
  device?: string;
  additionalInfo?: string;
}): Promise<number[]> {
  try {
    // Combine ticket information into a single text
    const ticketText = [
      `Title: ${ticket.title}`,
      `Description: ${ticket.description}`,
      ticket.category?.name ? `Category: ${ticket.category.name}` : '',
      ticket.device ? `Device: ${ticket.device}` : '',
      ticket.additionalInfo ? `Additional Info: ${ticket.additionalInfo}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return await embedText(ticketText);
  } catch (error) {
    console.error('Error generating ticket embedding:', error);
    throw new Error('Failed to generate embedding for ticket');
  }
}

// Export the configured embeddings instance for use in vector stores
export { embeddings }; 