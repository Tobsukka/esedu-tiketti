/**
 * Ticket AI Hooks
 * 
 * This file contains hooks that automatically process tickets
 * when they are created or updated, generating embeddings and
 * storing them in the vector database.
 */

import { PrismaClient, Ticket } from '@prisma/client';
import { processTicket, handleTicketDeletion } from '../ticketAIService.js';
import { validateAIConfig } from '../config.js';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Process a ticket after it is created or updated
 * @param ticket - The ticket to process
 */
export async function afterTicketUpsert(ticket: Ticket): Promise<void> {
  // Skip if AI is not properly configured
  if (!validateAIConfig()) {
    console.warn('AI services not properly configured. Skipping ticket processing.');
    return;
  }

  try {
    // Get the category for the ticket
    const ticketWithCategory = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: { category: true }
    });

    if (!ticketWithCategory) {
      console.error(`Ticket ${ticket.id} not found when processing for AI.`);
      return;
    }

    // Process the ticket for AI features
    await processTicket({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: {
        name: ticketWithCategory.category.name,
        id: ticketWithCategory.category.id
      },
      device: ticket.device || undefined,
      additionalInfo: ticket.additionalInfo || undefined
    });

    console.log(`Ticket ${ticket.id} processed for AI features.`);
  } catch (error) {
    console.error(`Error processing ticket ${ticket.id} for AI:`, error);
  }
}

/**
 * Handle ticket deletion
 * @param ticketId - ID of the deleted ticket
 */
export async function afterTicketDelete(ticketId: string): Promise<void> {
  // Skip if AI is not properly configured
  if (!validateAIConfig()) {
    console.warn('AI services not properly configured. Skipping ticket deletion handling.');
    return;
  }

  try {
    // Delete the ticket embedding
    await handleTicketDeletion(ticketId);
    console.log(`Ticket ${ticketId} embedding deleted.`);
  } catch (error) {
    console.error(`Error handling deletion of ticket ${ticketId}:`, error);
  }
} 