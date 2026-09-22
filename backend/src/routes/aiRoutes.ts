import express from 'express';
import { aiController } from '../controllers/aiController.js';
import { aiSettingsController } from '../controllers/aiSettingsController.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { UserRole } from '@prisma/client';
import { AI_TOOL_ROLES } from '../utils/roles.js';

const router = express.Router();

// First apply the auth middleware to parse the JWT token
router.use(authMiddleware);

// Perustaso: tukihenkilö ja sitä ylemmät roolit. Yksittäiset reitit
// kiristävät tätä alempana (AI_TOOL_ROLES = TEACHER+ADMIN, asetukset ADMIN).
router.use(requireRole([UserRole.SUPPORT]));

// Check OpenAI configuration status
// Vain AI-työkaluihin oikeutetut roolit (TEACHER, ADMIN).
router.get('/config-status', requireRole(AI_TOOL_ROLES), aiController.checkConfiguration);

// Get AI agent configuration (categories, complexity etc.)
// Vain AI-työkaluihin oikeutetut roolit (TEACHER, ADMIN).
router.get('/config', requireRole(AI_TOOL_ROLES), aiController.getAgentConfig);

// Generate training ticket preview (does not save)
// HUOM: SUPPORT ei kelpaa. Tässä järjestelmässä SUPPORT tarkoittaa
// harjoittelevaa opiskelijaa, joten hänen ei pidä pystyä luomaan itselleen
// harjoitustikettejä - esikatselu palauttaa myös ratkaisun.
router.post(
  '/generate-ticket-preview',
  requireRole(AI_TOOL_ROLES),
  aiController.generateTrainingTicketPreview
);

// Confirm and create the training ticket after preview
router.post(
  '/confirm-ticket-creation',
  requireRole(AI_TOOL_ROLES),
  aiController.confirmTrainingTicketCreation
);

// Generate simulated user response for an AI ticket
router.post('/tickets/:id/generate-response', aiController.generateUserResponse);

// Get the solution for an AI-generated ticket
// HUOM: SUPPORT ei kelpaa. Tämä palauttaa tiketin piilotetun ratkaisun, jonka
// opiskelijan on tarkoitus selvittää itse. Aiemmin reitti oli avoinna myös
// SUPPORT-roolille eli harjoitteleville opiskelijoille (ks. issue #29).
router.get(
  '/tickets/:ticketId/solution',
  requireRole(AI_TOOL_ROLES),
  aiController.getTicketSolution
);

// Summarize a ticket conversation
router.post('/tickets/:ticketId/summarize', aiController.summarizeConversation);

// Get support assistant response for a specific question about a ticket
router.post('/tickets/:ticketId/support-assistant', aiController.getSupportAssistantResponse);

// Get streaming support assistant response for a specific question about a ticket
router.post('/tickets/:ticketId/support-assistant/stream', aiController.getSupportAssistantResponseStream);

// Get conversation history between a student and the support assistant for a specific ticket
router.get('/tickets/:ticketId/support-assistant/history/:supportUserId', aiController.getSupportAssistantConversationHistory);

// Clear conversation history between a student and the support assistant for a specific ticket
router.delete('/tickets/:ticketId/support-assistant/history/:supportUserId', aiController.clearSupportAssistantConversationHistory);

// --- New Analysis Routes ---
router.get(
  '/analysis/tickets',
  requireRole(AI_TOOL_ROLES),
  aiController.getAiAnalysisTickets
);

router.get(
  '/analysis/tickets/:ticketId/conversation',
  requireRole(AI_TOOL_ROLES),
  aiController.getAiTicketConversation
);
// --- End New Analysis Routes ---

// --- AI Settings Routes (Admin only) ---
router.get(
  '/settings',
  requireRole([UserRole.ADMIN]),
  aiSettingsController.getSettings
);

router.put(
  '/settings',
  requireRole([UserRole.ADMIN]),
  aiSettingsController.updateSettings
);

router.post(
  '/settings/reset',
  requireRole([UserRole.ADMIN]),
  aiSettingsController.resetSettings
);
// --- End AI Settings Routes ---

export default router; 