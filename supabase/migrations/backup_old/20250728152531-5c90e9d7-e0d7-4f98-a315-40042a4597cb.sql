-- Enable RLS on all tables that need it and fix storage bucket issue

-- Enable RLS on tables that are missing it
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;

-- Create basic policies for these tables

-- Messages table - users can access their own session messages
CREATE POLICY "Users can view their own session messages"
ON messages
FOR ALL
TO authenticated
USING (
  session_id IN (
    SELECT id FROM sessions WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  session_id IN (
    SELECT id FROM sessions WHERE user_id = auth.uid()
  )
);

-- Service role access for messages
CREATE POLICY "Service role can manage all messages"
ON messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Agent messages - allow service role access
CREATE POLICY "Service role can manage all agent messages"
ON agent_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Documents - allow service role access
CREATE POLICY "Service role can manage all documents"
ON documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Destinations - allow service role access
CREATE POLICY "Service role can manage all destinations"
ON destinations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Workspace documents - users can access documents in their workspaces
CREATE POLICY "Users can view workspace documents in their workspaces"
ON workspace_documents
FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_members.workspace_id
    FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
    AND workspace_members.is_active = true
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_members.workspace_id
    FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
    AND workspace_members.is_active = true
  )
);

-- Service role access for workspace documents
CREATE POLICY "Service role can manage all workspace documents"
ON workspace_documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- N8N chat histories - allow service role access
CREATE POLICY "Service role can manage all n8n chat histories"
ON n8n_chat_histories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Agent states - allow service role access
CREATE POLICY "Service role can manage all agent states"
ON agent_states
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);