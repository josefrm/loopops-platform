-- Create session_contexts table to store Jira tickets for each session
CREATE TABLE public.session_contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  ticket_id TEXT NOT NULL,
  ticket_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint to sessions table
ALTER TABLE public.session_contexts 
ADD CONSTRAINT fk_session_contexts_session 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_session_contexts_session_id ON public.session_contexts(session_id);
CREATE INDEX idx_session_contexts_ticket_id ON public.session_contexts(ticket_id);

-- Enable Row Level Security
ALTER TABLE public.session_contexts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only access contexts for their own sessions
CREATE POLICY "Users can view their own session contexts" 
ON public.session_contexts 
FOR SELECT 
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create contexts for their own sessions" 
ON public.session_contexts 
FOR INSERT 
WITH CHECK (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own session contexts" 
ON public.session_contexts 
FOR UPDATE 
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own session contexts" 
ON public.session_contexts 
FOR DELETE 
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_session_contexts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_session_contexts_updated_at
  BEFORE UPDATE ON public.session_contexts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_contexts_updated_at();