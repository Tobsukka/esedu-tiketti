-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable (matches Prisma schema exactly)
CREATE TABLE IF NOT EXISTS "ticket_embeddings" (
  "id" SERIAL PRIMARY KEY,
  "ticket_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ticket_embeddings_ticket_id_key" UNIQUE ("ticket_id")
);

-- Add vector column (this is done outside of Prisma)
ALTER TABLE "ticket_embeddings" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Create an index for similarity search
CREATE INDEX IF NOT EXISTS "ticket_embeddings_idx" ON "ticket_embeddings" USING hnsw (embedding vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "ticket_embeddings" ADD CONSTRAINT "ticket_embeddings_ticket_id_fkey" 
FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE; 