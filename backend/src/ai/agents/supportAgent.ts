/**
 * Support Agent
 * 
 * This file implements the support team AI assistant agent.
 * It creates a workflow that analyzes tickets, finds similar ones, and
 * generates response suggestions.
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentState, AnalyzeTicketOutput, TicketAnalysis } from './supportAgentTypes.js';
import { AI_CONFIG } from '../config.js';
import { findSimilarTicketsForTicket } from '../ticketAIService.js';
import { generateStructuredResponse } from '../llm/llmService.js';

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

// Extended ticket info interface
interface TicketInfoWithComments {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  comments?: CommentWithUser[];
}

// Set up the LLM
const model = new ChatOpenAI({
  openAIApiKey: AI_CONFIG.llm.openai.apiKey,
  modelName: AI_CONFIG.llm.openai.advancedModel,
  temperature: 0.7,
  verbose: AI_CONFIG.agent.verbose,
});

/**
 * Analyze a ticket to identify problems and solutions
 */
async function analyzeTicket(
  title: string,
  description: string,
  category?: string,
  status?: string,
  priority?: string,
  comments?: CommentWithUser[]
): Promise<TicketAnalysis> {
  try {
    // Format comments for the prompt if available
    let commentsText = '';
    if (comments && comments.length > 0) {
      commentsText = `\nKommenttihistoria:\n${comments.map(comment => 
        `- ${new Date(comment.createdAt).toLocaleString('fi-FI')} - ${comment.author.name}: ${comment.content}`
      ).join('\n')}`;
    }
    
    const prompt = `
      Analysoi seuraava IT-tukipalvelun tiketti:
      
      Otsikko: ${title}
      Kuvaus: ${description}
      Kategoria: ${category || 'Ei määritetty'}
      Tila: ${status || 'Ei määritetty'}
      Prioriteetti: ${priority || 'Ei määritetty'}${commentsText}
      
      Anna kattava analyysi, joka sisältää ongelman kategorisoinnin, monimutkaisuuden arvioinnin,
      aika-arvion, keskeiset havainnot, mahdolliset syyt, puuttuvat tiedot ja suositellun lähestymistavan.
      ${comments && comments.length > 0 ? 'Ota huomioon kommenttihistoria analyysissasi.' : ''}
    `;

    const instructions = `
      Olet asiantunteva IT-tukianalyytikko. Analysoi tiketti ja palauta JSON-objekti, jossa on seuraavat ominaisuudet:
      - problemCategory: tarkka tekninen kategoria ongelmalle (suomeksi)
      - problemComplexity: yksi vaihtoehdoista "Simple", "Moderate", tai "Complex" (käytä näitä englanninkielisiä arvoja, mutta analyysissasi kirjoita kuvauksesi suomeksi)
      - estimatedTimeToResolve: ihmisluettava aika-arvio (suomeksi)
      - keyInsights: taulukko 2-4 keskeisestä havainnosta ongelmaan liittyen (suomeksi)
      - possibleCauses: taulukko 2-4 mahdollisesta syystä (suomeksi)
      - missingInformation: taulukko lisätiedoista, joita tarvitaan ongelman ratkaisemiseksi (suomeksi)
      - recommendedApproach: lyhyt strategia ongelman ratkaisemiseksi (suomeksi)
      - potentialSolutions: taulukko 2-3 mahdollisesta ratkaisusta (suomeksi)
    `;

    const result = await generateStructuredResponse<AnalyzeTicketOutput | TicketAnalysis>(
      prompt,
      instructions,
      'advanced'
    );

    // Log the result to debug
    console.log('Raw analysis result from LLM:', result);

    // Handle different response formats
    let analysis: TicketAnalysis;
    
    if ('analysis' in result && result.analysis) {
      // If the response has an 'analysis' property (expected format)
      analysis = result.analysis;
    } else if ('problemCategory' in result) {
      // If the LLM returned the analysis directly without wrapping it
      analysis = result as TicketAnalysis;
    } else {
      // Handle unexpected format
      console.error('Unexpected analysis result format:', result);
      throw new Error('Invalid analysis format received from LLM');
    }
    
    console.log('Parsed analysis result:', analysis);
    return analysis;
  } catch (error) {
    console.error('Error analyzing ticket:', error);
    throw new Error('Failed to analyze ticket');
  }
}

/**
 * Find similar tickets based on content
 */
async function findSimilarTickets(
  title: string,
  description: string,
  category?: string
): Promise<Array<{ id: string; title: string; similarity: number }>> {
  try {
    const ticket = {
      title,
      description,
      category: { name: category },
    };

    const similarTickets = await findSimilarTicketsForTicket(ticket);
    
    // In a full implementation, we would fetch the actual ticket titles
    return similarTickets.map(t => ({
      id: t.ticketId,
      title: 'Samankaltainen tiketti', // Placeholder in Finnish
      similarity: t.similarity,
    }));
  } catch (error) {
    console.error('Error finding similar tickets:', error);
    return [];
  }
}

/**
 * Retrieve relevant knowledge for a ticket
 */
async function retrieveKnowledge(
  analysis: TicketAnalysis | undefined,
  query: string,
  comments?: CommentWithUser[]
): Promise<string[]> {
  // In a full implementation, this would search a knowledge base based on the analysis
  // For now, we'll simulate with a basic response
  try {
    const category = analysis?.problemCategory || 'general';
    console.log(`Looking up knowledge for category: ${category}`);
    
    // Add context from comments if available
    let contextFromComments = '';
    if (comments && comments.length > 0) {
      contextFromComments = `Tiketillä on ${comments.length} kommenttia, joissa keskustellaan ongelmasta.`;
    }
    
    // In the future, this would use the category and comments to fetch relevant knowledge
    let knowledge = [
      "Sähköpostisalasanat vanhenevat yrityksen käytännön mukaan 90 päivän välein.",
      "Viiden virheellisen salasanayrityksen jälkeen tilit lukitaan automaattisesti turvallisuussyistä.",
      "Käyttäjät voivat vaihtaa salasanansa osoitteessa password.example.com",
      "Tukihenkilöstö voi avata lukittuja tilejä hallintapaneelissa Käyttäjähallinta-osion kautta."
    ];
    
    // Add the comment context as a knowledge item if available
    if (contextFromComments) {
      knowledge.push(contextFromComments);
    }
    
    return knowledge;
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    return [];
  }
}

/**
 * Generate a support response
 */
async function generateResponse(
  ticketTitle: string,
  ticketDescription: string,
  ticketCategory: string | undefined,
  analysis: TicketAnalysis | undefined,
  similarTickets: Array<{ id: string; title: string; similarity: number }>,
  knowledge: string[],
  comments?: CommentWithUser[]
): Promise<{ responseText: string; nextSteps: string[] }> {
  try {
    // Ensure analysis exists or create default analysis to prevent errors
    const safeAnalysis: TicketAnalysis = analysis || {
      problemCategory: 'Määrittämätön ongelma',
      problemComplexity: 'Moderate',
      estimatedTimeToResolve: 'Tuntematon',
      keyInsights: ['Analyysia ei saatavilla'],
      possibleCauses: ['Tietoja ei saatavilla'],
      missingInformation: ['Täydelliset tiketin tiedot'],
      recommendedApproach: 'Tarkista tiketin tiedot',
      potentialSolutions: ['Kerää lisätietoa ongelmasta']
    };
    
    // Map English complexity to Finnish for display
    const complexityInFinnish = {
      'Simple': 'Helppo',
      'Moderate': 'Keskivaikea',
      'Complex': 'Monimutkainen'
    };

    // Format comments for the prompt if available
    let commentsContext = '';
    if (comments && comments.length > 0) {
      commentsContext = `\n\nKommenttihistoria:\n${comments.map(comment => 
        `- ${new Date(comment.createdAt).toLocaleString('fi-FI')} - ${comment.author.name}: ${comment.content}`
      ).join('\n')}`;
    }
    
    const prompt = `
      Luo rento ja ystävällinen vastaus seuraavaan IT-tukipalvelun tikettiin.
      Vastauksen tulee olla IT-opiskelijan kirjoittama, joka opettelee tukipalvelun tarjoamista,
      ei virallisen yrityksen tukihenkilön. Käytä rentoa, auttavaa sävyä.
      
      Tiketin otsikko: ${ticketTitle}
      Tiketin kuvaus: ${ticketDescription}
      Kategoria: ${ticketCategory || 'Ei määritetty'}
      
      Analyysi:
      - Ongelman tyyppi: ${safeAnalysis.problemCategory}
      - Monimutkaisuus: ${complexityInFinnish[safeAnalysis.problemComplexity] || safeAnalysis.problemComplexity}
      - Arvioitu ratkaisuaika: ${safeAnalysis.estimatedTimeToResolve}
      - Keskeiset havainnot: ${safeAnalysis.keyInsights.join(', ')}
      - Mahdolliset syyt: ${safeAnalysis.possibleCauses.join(', ')}
      - Suositeltu lähestymistapa: ${safeAnalysis.recommendedApproach}
      
      Tietämys:
      ${knowledge.map(item => `- ${item}`).join('\n')}${commentsContext}
      
      Vastaa suoraan käyttäjälle häntä puhutellen, käyttäen rennompaa kieltä. Vastauksen tulee olla ystävällinen ja helposti ymmärrettävä.
      Vastaa suomeksi. Aloita tervehdyksellä ja esittelyllä. Kerro käyttäjälle, että olet tiketin käsittelijä.
      Ole empaattinen ongelmaa kohtaan ja ilmaise ymmärtäväsi tilannetta. Vastaa tiketin ongelmaan rennolla sävyllä, mutta
      ammattitaitoisesti. Käytä persoonallista ja kaverimaista tyyliä. Käytä välillä rentoja sanontoja ja puhekielen ilmauksia.
      Vältä liian virallisia fraaseja, pitkiä virkeitä tai monimutkaista teknistä jargonia.
      ${comments && comments.length > 0 ? 'Huomioi kommenttihistoria vastauksessasi ja viittaa siihen tarvittaessa.' : ''}
    `;

    const instructions = `
      Luo JSON-vastaus, jossa on:
      - responseText: Täydellinen, ystävällinen vastaus tukipyyntöön suomeksi
      - nextStepsRecommendation: 2-4 seuraavan vaiheen ehdotusta tukihenkilölle suomeksi
    `;

    // Try to generate a response with error handling
    try {
      const response = await generateStructuredResponse<{
        responseText: string;
        nextStepsRecommendation: string[];
      }>(prompt, instructions);

      return {
        responseText: response.responseText,
        nextSteps: response.nextStepsRecommendation,
      };
    } catch (llmError) {
      console.error('Error from LLM service:', llmError);
      
      // Create a fallback response since the LLM failed
      return {
        responseText: `Hello,\n\nThank you for submitting your ticket about "${ticketTitle}".\n\nBased on the information provided, this appears to be a ${ticketCategory || 'technical'} issue. To help resolve this efficiently, could you please provide more details about the specific problem you're experiencing?\n\nIn the meantime, I'll research similar issues and prepare some potential solutions.\n\nThank you for your patience.\n\nBest regards,\nSupport Team`,
        nextSteps: [
          "Ask for more details about the issue",
          "Check similar tickets for potential solutions",
          "Escalate to specialized support if needed"
        ]
      };
    }
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Run the support agent to analyze a ticket, find similar tickets, retrieve knowledge
 * and generate a response
 */
export async function runSupportAgent(
  query: string,
  ticketInfo?: TicketInfoWithComments
): Promise<AgentState> {
  try {
    // Initialize state with proper default values to avoid type issues
    const ticketTitle = ticketInfo?.title || 'No title provided';
    const ticketDescription = ticketInfo?.description || 'No description provided';
    const comments = ticketInfo?.comments;
    
    // Log the input context
    console.log('AI Agent Input Context:', {
      query,
      ticketInfo: {
        id: ticketInfo?.id,
        title: ticketTitle,
        description: ticketDescription?.substring(0, 50) + '...',
        category: ticketInfo?.category,
        priority: ticketInfo?.priority,
        status: ticketInfo?.status,
        commentsCount: comments?.length || 0
      }
    });
    
    const state: AgentState = {
      userQuery: query,
      ticketId: ticketInfo?.id,
      ticketTitle,
      ticketDescription,
      ticketCategory: ticketInfo?.category,
      ticketPriority: ticketInfo?.priority,
      ticketStatus: ticketInfo?.status,
      ticketComments: comments,
    };

    // Step 1: Analyze the ticket
    let analysis: TicketAnalysis;
    try {
      analysis = await analyzeTicket(
        ticketTitle, 
        ticketDescription, 
        ticketInfo?.category, 
        ticketInfo?.status, 
        ticketInfo?.priority,
        comments
      );
      state.analysisResult = analysis;
    } catch (error) {
      console.error('Error in analyze ticket step:', error);
      state.error = 'Failed to analyze the ticket';
      return state;
    }

    // Step 2: Find similar tickets
    try {
      const similarTickets = await findSimilarTickets(
        ticketTitle, 
        ticketDescription, 
        ticketInfo?.category
      );
      state.relevantTickets = similarTickets;
    } catch (error) {
      console.error('Error in find similar tickets step:', error);
      // Continue even if this step fails
    }

    // Step 3: Retrieve knowledge
    try {
      const relevantKnowledge = await retrieveKnowledge(
        state.analysisResult,
        query,
        comments
      );
      state.relevantKnowledge = relevantKnowledge;
    } catch (error) {
      console.error('Error in retrieve knowledge step:', error);
      // Continue even if this step fails
    }

    // Step 4: Generate response
    try {
      const responseData = await generateResponse(
        ticketTitle, 
        ticketDescription, 
        ticketInfo?.category, 
        state.analysisResult, 
        state.relevantTickets || [], 
        state.relevantKnowledge || [],
        comments
      );
      
      state.suggestedResponse = responseData.responseText;
      state.nextSteps = responseData.nextSteps;
    } catch (error) {
      console.error('Error in generate response step:', error);
      state.error = 'Failed to generate response';
      return state;
    }
    
    return state;
  } catch (error) {
    // Handle any unexpected errors in the agent
    console.error('Unexpected error in support agent:', error);
    return {
      userQuery: query,
      error: 'An unexpected error occurred in the support agent'
    };
  }
} 