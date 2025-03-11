# AI Integration with pgvector

This document explains how vector embeddings are implemented in the Tiketti system.

## Overview

The system uses pgvector with PostgreSQL to store and query vector embeddings for tickets. Since Prisma doesn't natively support the PostgreSQL `vector` type, we use a hybrid approach:

1. The `ticket_embeddings` table structure is managed by Prisma (id, ticket_id, created_at, updated_at)
2. The `embedding` column (vector type) is managed via direct SQL

## Implementation Details

### Table Structure

The `ticket_embeddings` table structure:

```sql
CREATE TABLE "ticket_embeddings" (
  "id" SERIAL PRIMARY KEY,
  "ticket_id" TEXT NOT NULL UNIQUE REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "embedding" vector(1536),  -- This column is managed outside of Prisma
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
```

### Database Initialization

The pgvector extension and embedding column are initialized in `backend/init-pgvector.sql`, which runs automatically when the Docker container starts. This script:

1. Enables the pgvector extension
2. Ensures the embedding column exists (even if Prisma doesn't manage it)
3. Creates the HNSW index for efficient similarity searches

### Vector Operations

Vector operations (storing, searching, deleting) are implemented in `backend/src/ai/vectorstore/pgVectorStore.ts` using direct SQL queries instead of Prisma queries.

## Development Setup

When running in development mode, make sure:

1. The database container is running (`npm run db:up`)
2. The `init-pgvector.sql` script has executed

## Troubleshooting

If you encounter issues with the `ticket_embeddings` table or the vector column:

1. Check if the pgvector extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

2. Check if the ticket_embeddings table exists with the embedding column:
   ```sql
   \d ticket_embeddings
   ```

3. If needed, manually add the embedding column:
   ```sql
   ALTER TABLE "ticket_embeddings" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
   ```

4. Create the index if it's missing:
   ```sql
   CREATE INDEX IF NOT EXISTS "ticket_embeddings_idx" ON "ticket_embeddings" USING hnsw (embedding vector_cosine_ops);
   ```

## Why This Approach?

This hybrid approach allows us to:

1. Use Prisma for most database operations
2. Leverage pgvector's capabilities for semantic search
3. Maintain a clean design without workarounds in the application code

The embedding column is intentionally excluded from the Prisma schema to prevent Prisma from trying to manage it (since it doesn't understand the vector type). 