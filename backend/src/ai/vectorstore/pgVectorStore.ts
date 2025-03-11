/**
 * PostgreSQL Vector Store Service
 * 
 * This service provides functions to store and retrieve embeddings using
 * PostgreSQL with pgvector extension. It uses direct SQL queries for vector operations.
 */

import pkg from 'pg';
const { Client } = pkg;
import { embeddings } from '../embeddings/embeddingService.js';
import { AI_CONFIG } from '../config.js';

// Database connection config from environment
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
};

/**
 * Store ticket embedding in vector database
 * @param ticketId - ID of the ticket
 * @param embedding - Vector embedding
 * @returns Promise resolving to true if successful
 */
export async function storeTicketEmbedding(
  ticketId: string,
  embedding: number[]
): Promise<boolean> {
  const client = new Client(connectionConfig);
  
  try {
    await client.connect();
    
    // Store the embedding in the ticket_embeddings table
    const result = await client.query(
      `INSERT INTO ticket_embeddings (ticket_id, embedding)
       VALUES ($1, $2)
       ON CONFLICT (ticket_id) 
       DO UPDATE SET embedding = $2, updated_at = NOW()
       RETURNING id`,
      [ticketId, `[${embedding.join(',')}]`]
    );
    
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error storing ticket embedding:', error);
    throw new Error('Failed to store ticket embedding');
  } finally {
    await client.end();
  }
}

/**
 * Find similar tickets by vector similarity
 * @param embedding - Query embedding vector
 * @param limit - Maximum number of results to return
 * @param threshold - Similarity threshold (0-1)
 * @returns Promise resolving to array of similar ticket IDs with similarity scores
 */
export async function findSimilarTickets(
  embedding: number[],
  limit: number = AI_CONFIG.similaritySearch.maxResults,
  threshold: number = AI_CONFIG.similaritySearch.threshold
): Promise<Array<{ ticketId: string; similarity: number }>> {
  const client = new Client(connectionConfig);
  
  try {
    await client.connect();
    
    // Query for similar tickets using cosine similarity
    const result = await client.query(
      `SELECT ticket_id, 1 - (embedding <=> $1::vector) AS similarity
       FROM ticket_embeddings
       WHERE 1 - (embedding <=> $1::vector) > $2
       ORDER BY similarity DESC
       LIMIT $3`,
      [`[${embedding.join(',')}]`, threshold, limit]
    );
    
    return result.rows.map(row => ({
      ticketId: row.ticket_id,
      similarity: parseFloat(row.similarity)
    }));
  } catch (error) {
    console.error('Error finding similar tickets:', error);
    throw new Error('Failed to find similar tickets');
  } finally {
    await client.end();
  }
}

/**
 * Search tickets by text query
 * @param query - Text query to search for
 * @param limit - Maximum number of results to return
 * @returns Promise resolving to array of ticket IDs with similarity scores
 */
export async function searchTicketsByText(
  query: string,
  limit: number = AI_CONFIG.similaritySearch.maxResults
): Promise<Array<{ ticketId: string; similarity: number }>> {
  try {
    // Generate embedding for the query text
    const queryEmbedding = await embeddings.embedQuery(query);
    
    // Use the embedding to find similar tickets
    return await findSimilarTickets(queryEmbedding, limit);
  } catch (error) {
    console.error('Error searching tickets by text:', error);
    throw new Error('Failed to search tickets by text');
  }
}

/**
 * Delete ticket embedding from vector database
 * @param ticketId - ID of the ticket
 * @returns Promise resolving to true if successful
 */
export async function deleteTicketEmbedding(ticketId: string): Promise<boolean> {
  const client = new Client(connectionConfig);
  
  try {
    await client.connect();
    
    // Delete the embedding from the ticket_embeddings table
    const result = await client.query(
      `DELETE FROM ticket_embeddings WHERE ticket_id = $1`,
      [ticketId]
    );
    
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error deleting ticket embedding:', error);
    throw new Error('Failed to delete ticket embedding');
  } finally {
    await client.end();
  }
} 