/**
 * AI Configuration
 * 
 * This file contains configuration for AI-related components, including:
 * - LLM providers (OpenAI, Azure, etc.)
 * - Vector database settings
 * - Embedding models
 * - Feature flags
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const AI_CONFIG = {
  // LLM Provider Configuration
  llm: {
    provider: process.env.FALLBACK_LLM_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      organization: process.env.OPENAI_ORGANIZATION,
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      completionModel: process.env.OPENAI_COMPLETION_MODEL || 'gpt-3.5-turbo',
      advancedModel: process.env.OPENAI_ADVANCED_MODEL || 'gpt-4',
    },
  },

  // Vector Database Configuration
  vectorDb: {
    postgres: {
      dimension: parseInt(process.env.PGVECTOR_DIMENSION || '1536', 10),
      indexType: process.env.PGVECTOR_INDEX_TYPE || 'hnsw',
      listSize: parseInt(process.env.PGVECTOR_LIST_SIZE || '100', 10),
      efConstruction: parseInt(process.env.PGVECTOR_EF_CONSTRUCTION || '64', 10),
      m: parseInt(process.env.PGVECTOR_M || '16', 10),
    },
  },

  // Similarity Search Configuration
  similaritySearch: {
    threshold: parseFloat(process.env.SIMILARITY_MATCH_THRESHOLD || '0.7'),
    maxResults: parseInt(process.env.SIMILARITY_MAX_RESULTS || '5', 10),
  },

  // Document Processing
  documentProcessing: {
    chunkSize: parseInt(process.env.DOCUMENT_CHUNK_SIZE || '1000', 10),
    chunkOverlap: parseInt(process.env.DOCUMENT_CHUNK_OVERLAP || '200', 10),
  },

  // Caching
  cache: {
    enabled: process.env.AI_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.AI_CACHE_TTL || '3600', 10),
  },

  // Rate Limiting
  rateLimit: {
    enabled: process.env.AI_RATE_LIMIT_ENABLED === 'true',
    maxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS || '60', 10),
    timeWindow: parseInt(process.env.AI_RATE_LIMIT_TIME_WINDOW || '60', 10),
  },

  // LangSmith for debugging and monitoring
  langsmith: {
    enabled: process.env.LANGSMITH_ENABLED === 'true',
    apiKey: process.env.LANGSMITH_API_KEY || '',
    project: process.env.LANGSMITH_PROJECT || 'tiketti-system',
  },

  // Agent Configuration
  agent: {
    maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '10', 10),
    verbose: process.env.AGENT_VERBOSE === 'true',
  },

  // Feature Flags
  features: {
    solutionRecommender: process.env.ENABLE_SOLUTION_RECOMMENDER === 'true',
    knowledgeExtraction: process.env.ENABLE_KNOWLEDGE_EXTRACTION === 'true',
    agentChat: process.env.ENABLE_AGENT_CHAT === 'true',
  },
};

// Validate required configuration
export function validateAIConfig() {
  const missingConfig: string[] = [];

  if (!AI_CONFIG.llm.openai.apiKey) {
    missingConfig.push('OPENAI_API_KEY');
  }

  if (missingConfig.length > 0) {
    console.warn(`Missing AI configuration: ${missingConfig.join(', ')}`);
    return false;
  }

  return true;
} 