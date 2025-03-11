# AI Integration Documentation

## Overview

The Tiketti system incorporates a sophisticated AI integration using LangChain and LangGraph to enhance ticket handling and resolution. This document provides a comprehensive overview of the AI architecture, components, workflows, and implementation details.

## Architecture

The AI integration architecture consists of several interconnected components:

1. **AI Service Layer** - Core AI functionality exposed through backend APIs
2. **Vector Database** - PostgreSQL with pgvector extension for semantic search
3. **Support Agent** - LangChain-based AI agent for ticket analysis and response generation
4. **Embedding Service** - Generates and manages vector embeddings for semantic search
5. **LLM Service** - Interfaces with OpenAI/Azure OpenAI models

![AI Architecture](./diagrams/ai-architecture.png)
*See `diagrams/ai-architecture-diagram.md` for the source*

## Component Details

### AI Service Layer

The AI Service Layer interfaces with the main application and exposes AI capabilities through RESTful APIs. Key endpoints include:

- `/api/ai/support-agent` - Runs the support agent to analyze tickets and generate responses
- `/api/ai/similar-tickets` - Finds semantically similar tickets
- `/api/ai/search-tickets` - Performs semantic search across tickets
- `/api/ai/process-ticket` - Processes tickets to generate embeddings

The service layer is implemented in `backend/src/ai/routes.ts`.

### Vector Database

We use PostgreSQL with the pgvector extension to store and query vector embeddings. This enables:

- Semantic similarity search for tickets
- Efficient nearest neighbor queries
- Storing embeddings alongside ticket data

Database schema:
- `ticket_embeddings` table - Stores vector representations of tickets
- Vector dimension: 1536 (OpenAI embedding dimension)
- Index type: HNSW (Hierarchical Navigable Small World) for efficient similarity search

See `diagrams/vector-db-diagram.md` for the database schema diagram.

### Support Agent

The Support Agent is a LangChain-based AI agent that:

1. Analyzes ticket content to identify problems and solutions
2. Finds similar tickets for reference
3. Retrieves relevant knowledge
4. Generates suggested responses and next steps

The agent workflow is defined in `backend/src/ai/agents/supportAgent.ts`.

![Support Agent Workflow](./diagrams/agent-workflow.png)
*See `diagrams/agent-workflow-diagram.md` for the source*

### Embedding Service

The Embedding Service generates vector embeddings for tickets using OpenAI's embedding models. Key functions:

- `embedText()` - Generates embeddings for a single text
- `embedTexts()` - Generates embeddings for multiple texts in batch
- `embedTicket()` - Specifically formats and embeds ticket data

Implementation: `backend/src/ai/embeddings/embeddingService.ts`

### LLM Service

The LLM Service provides a unified interface to language models with different configurations:

- Standard chat model: Used for general responses (typically gpt-3.5-turbo)
- Advanced chat model: Used for complex analysis (typically gpt-4)
- Structured response generation: For obtaining consistently formatted JSON responses

Implementation: `backend/src/ai/llm/llmService.ts`

## Key Data Flows

### Ticket Embedding Process

When a ticket is created or updated:

1. The ticket controller calls `afterTicketUpsert` hook
2. The hook calls `processTicket` in the ticket AI service
3. The service generates embeddings using the embedding service
4. Embeddings are stored in the vector database

![Ticket Embedding Flow](./diagrams/ticket-embedding.png)
*See `diagrams/ticket-embedding-diagram.md` for the source*

### Support Agent Workflow

When a support person uses the AI assistant:

1. Frontend sends query to `/api/ai/support-agent` endpoint
2. The endpoint calls `runSupportAgent` function
3. Agent performs the following steps:
   - Analyzes the ticket (calling OpenAI)
   - Finds similar tickets (querying vector database)
   - Retrieves relevant knowledge
   - Generates a response (calling OpenAI)
4. Result is returned to frontend and displayed in UI

See `diagrams/support-agent-sequence.md` for a detailed sequence diagram.

## State Management

The Support Agent uses a state object to track progress and data throughout its execution:

```typescript
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
  relevantTickets?: Array<{ id: string; title: string; similarity: number }>;
  relevantKnowledge?: string[];
  
  // Agent output
  suggestedSolution?: string;
  suggestedResponse?: string;
  nextSteps?: string[];
  analysisResult?: TicketAnalysis;
  
  // Control flow
  error?: string;
}
```

## Technical Implementation

### Ticket Analysis

The ticket analysis process:

1. Formats the ticket data (title, description, category, etc.)
2. Sends it to the advanced LLM model (GPT-4)
3. Structures the response into a `TicketAnalysis` object:
   - Problem category and complexity
   - Estimated time to resolve
   - Key insights and possible causes
   - Required information
   - Recommended approach and potential solutions

### Vector Similarity Search

Vector search implementation:

1. Vector queries use cosine similarity to find matching tickets
2. Configurable parameters control:
   - Maximum number of results
   - Similarity threshold
   - Index type and configuration
3. Direct SQL queries with pgvector extension optimize performance

Example query:
```sql
SELECT ticket_id, 1 - (embedding <=> $1) AS similarity 
FROM ticket_embeddings 
WHERE 1 - (embedding <=> $1) > $2 
ORDER BY similarity DESC 
LIMIT $3
```

### Error Handling and Resilience

The AI system includes several resilience mechanisms:

1. Fallback values when analysis fails
2. JSON parsing with support for markdown code blocks
3. Timeouts for LLM calls (60-second default)
4. Comprehensive error logging
5. Graceful degradation when components fail

## Frontend Integration

The AI Support Assistant component:

1. Provides an intuitive interface for support staff
2. Offers quick-access prompt suggestions
3. Displays results in categorized tabs:
   - Response suggestions
   - Ticket analysis
   - Knowledge base entries
4. Handles loading and error states gracefully

Implementation: `frontend/src/components/Tickets/AIAssistant.jsx`

## Configuration

The AI system is configured through environment variables:

```
# LLM Provider Configuration
FALLBACK_LLM_PROVIDER=openai
OPENAI_API_KEY=your-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_COMPLETION_MODEL=gpt-3.5-turbo
OPENAI_ADVANCED_MODEL=gpt-4

# Vector Database Configuration
PGVECTOR_DIMENSION=1536
PGVECTOR_INDEX_TYPE=hnsw
PGVECTOR_LIST_SIZE=100
PGVECTOR_EF_CONSTRUCTION=64
PGVECTOR_M=16

# Similarity Search Configuration
SIMILARITY_MATCH_THRESHOLD=0.7
SIMILARITY_MAX_RESULTS=5
```

## Future Enhancements

Planned enhancements to the AI system:

1. **Automatic Ticket Triage**
   - Categorize incoming tickets automatically
   - Assign priority levels
   - Suggest relevant support personnel

2. **Enhanced Knowledge Base Integration**
   - Connect with documentation systems
   - Learn from successful ticket resolutions
   - Improve relevance of retrieved knowledge

3. **Conversation Memory**
   - Maintain context across multiple interactions
   - Track resolution progress
   - Personalize responses based on history

## Appendix

### Key Files and Locations

- `backend/src/ai/config.ts` - AI configuration
- `backend/src/ai/routes.ts` - API endpoints
- `backend/src/ai/embeddings/embeddingService.ts` - Embedding generation
- `backend/src/ai/vectorstore/pgVectorStore.ts` - Vector database operations
- `backend/src/ai/llm/llmService.ts` - Language model interface
- `backend/src/ai/agents/supportAgent.ts` - Support agent implementation
- `backend/src/ai/agents/supportAgentTypes.ts` - Type definitions
- `frontend/src/components/Tickets/AIAssistant.jsx` - Frontend UI component 