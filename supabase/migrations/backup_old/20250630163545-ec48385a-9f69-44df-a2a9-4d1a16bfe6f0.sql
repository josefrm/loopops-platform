
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE, 
  ticket_id TEXT NOT NULL, 
  role TEXT NOT NULL, 
  content TEXT NOT NULL,
  embedding VECTOR(1536), 
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON messages (session_id);
