-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop the tables if they need to be recreated
-- DROP TABLE IF EXISTS ticket_embeddings;

-- Ensure the ticket_embeddings table exists with proper structure
CREATE TABLE IF NOT EXISTS "ticket_embeddings" (
  "id" SERIAL PRIMARY KEY,
  "ticket_id" TEXT NOT NULL,
  "embedding" vector(1536),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  UNIQUE("ticket_id")
);

-- Create the foreign key constraint 
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_embeddings_ticket_id_fkey'
  ) THEN
    ALTER TABLE "ticket_embeddings" 
    ADD CONSTRAINT "ticket_embeddings_ticket_id_fkey" 
    FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Make sure the embedding column exists (in case Prisma removes it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_embeddings' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE "ticket_embeddings" ADD COLUMN "embedding" vector(1536);
  END IF;
END
$$;

-- Create an index for efficient vector similarity searches
CREATE INDEX IF NOT EXISTS "ticket_embeddings_idx" ON "ticket_embeddings" USING hnsw ("embedding" vector_cosine_ops);

-- Add a comment to the table to explain the special handling
COMMENT ON TABLE "ticket_embeddings" IS 'This table is managed by both Prisma and manual SQL. The embedding column is managed via direct SQL.';
COMMENT ON COLUMN "ticket_embeddings"."embedding" IS 'Vector column managed outside of Prisma schemas.';

-- Test that the extension is working
-- CREATE TABLE IF NOT EXISTS vector_test (
--   id SERIAL PRIMARY KEY,
--   embedding vector(3)
-- );
-- 
-- INSERT INTO vector_test (embedding) VALUES ('[1,2,3]'), ('[4,5,6]');
-- 
-- SELECT * FROM vector_test;
-- 
-- DROP TABLE IF EXISTS vector_test; 