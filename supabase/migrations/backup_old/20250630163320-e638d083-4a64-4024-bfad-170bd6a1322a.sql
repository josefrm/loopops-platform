
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), 
  ticket_id TEXT,         
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON sessions (user_id);
CREATE INDEX ON sessions (ticket_id);
