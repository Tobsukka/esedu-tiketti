/**
 * AI API Routes
 * 
 * This file defines the API routes for AI functionality including:
 * - Support agent API
 * - Similar ticket search
 * - Ticket embedding and analysis
 */

import express from 'express';
import { runSupportAgent } from './agents/supportAgent.js';
import { processTicket, searchTickets, findSimilarTicketsForTicket } from './ticketAIService.js';
import { validateAIConfig } from './config.js';

const router = express.Router();

// Middleware to check if AI is properly configured
router.use((req, res, next) => {
  if (!validateAIConfig()) {
    return res.status(503).json({ 
      error: 'AI services are not properly configured. Check API keys and configuration.' 
    });
  }
  next();
});

/**
 * Support Agent API
 * POST /ai/support-agent
 * 
 * Run the support agent to analyze a ticket and provide assistance
 */
router.post('/support-agent', async (req, res) => {
  try {
    const { 
      query, 
      ticketId, 
      ticketTitle, 
      ticketDescription, 
      ticketCategory, 
      ticketPriority, 
      ticketStatus,
      includeComments 
    } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Log request information for debugging
    console.log('Support agent request:', {
      ticketId,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      hasTitle: !!ticketTitle,
      hasDescription: !!ticketDescription,
      includeComments
    });
    
    // Fetch ticket comments if includeComments is true
    type CommentWithUser = {
      id: string;
      content: string;
      createdAt: Date;
      author: {
        id: string;
        name: string;
      };
    };
    
    let comments: CommentWithUser[] = [];
    if (includeComments && ticketId) {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        const fetchedComments = await prisma.comment.findMany({
          where: { ticketId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        
        // Transform the fetched comments to match our expected format
        comments = fetchedComments.map(comment => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: {
            id: comment.author.id,
            name: comment.author.name
          }
        }));
        
        console.log(`Fetched ${comments.length} comments for ticket ${ticketId}`);
      } catch (error) {
        console.error('Error fetching comments:', error);
        // Continue without comments if there's an error
      }
    }
    
    interface TicketInfoWithComments {
      id?: string;
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
      status?: string;
      comments?: CommentWithUser[];
    }
    
    const ticketInfo: TicketInfoWithComments = {
      id: ticketId,
      title: ticketTitle,
      description: ticketDescription,
      category: ticketCategory,
      priority: ticketPriority,
      status: ticketStatus,
      comments: includeComments ? comments : undefined
    };
    
    const result = await runSupportAgent(query, ticketInfo);
    
    // If there was an error in the agent, send it as part of the response but with a 200 status
    // This allows the frontend to display the error message properly
    if (result.error) {
      console.warn('Support agent completed with errors:', result.error);
      return res.json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error in support agent API:', error);
    return res.status(500).json({ 
      error: 'Failed to process support agent request',
      message: error instanceof Error ? error.message : 'Unknown error', 
      userQuery: req.body.query || ''
    });
  }
});

/**
 * Similar Tickets API
 * POST /ai/similar-tickets
 * 
 * Find tickets similar to the provided ticket
 */
router.post('/similar-tickets', async (req, res) => {
  try {
    const { ticketTitle, ticketDescription, ticketCategory, limit } = req.body;
    
    if (!ticketTitle || !ticketDescription) {
      return res.status(400).json({ error: 'Ticket title and description are required' });
    }
    
    const similarTickets = await findSimilarTicketsForTicket({
      title: ticketTitle,
      description: ticketDescription,
      category: { name: ticketCategory }
    }, limit);
    
    return res.json({ similarTickets });
  } catch (error) {
    console.error('Error finding similar tickets:', error);
    return res.status(500).json({ error: 'Failed to find similar tickets' });
  }
});

/**
 * Search Tickets API
 * GET /ai/search-tickets
 * 
 * Search tickets using semantic search
 */
router.get('/search-tickets', async (req, res) => {
  try {
    const { query, limit } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const limitNum = limit ? parseInt(limit as string, 10) : undefined;
    const results = await searchTickets(query, limitNum);
    
    return res.json({ results });
  } catch (error) {
    console.error('Error searching tickets:', error);
    return res.status(500).json({ error: 'Failed to search tickets' });
  }
});

/**
 * Process Ticket API
 * POST /ai/process-ticket
 * 
 * Process a ticket to generate embeddings and analyze it
 */
router.post('/process-ticket', async (req, res) => {
  try {
    const { ticketId, ticketTitle, ticketDescription, ticketCategory, deviceInfo, additionalInfo } = req.body;
    
    if (!ticketId || !ticketTitle || !ticketDescription) {
      return res.status(400).json({ error: 'Ticket ID, title, and description are required' });
    }
    
    const success = await processTicket({
      id: ticketId,
      title: ticketTitle,
      description: ticketDescription,
      category: { name: ticketCategory, id: '' },
      device: deviceInfo,
      additionalInfo
    });
    
    if (success) {
      return res.json({ success, message: 'Ticket processed successfully' });
    } else {
      return res.status(500).json({ success, error: 'Failed to process ticket' });
    }
  } catch (error) {
    console.error('Error processing ticket:', error);
    return res.status(500).json({ error: 'Failed to process ticket' });
  }
});

export default router; 