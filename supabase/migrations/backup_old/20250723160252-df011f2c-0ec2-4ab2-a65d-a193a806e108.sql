-- Add workspace_id column to agents table
ALTER TABLE public.agents ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);

-- Create llm_models table
CREATE TABLE public.llm_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  description TEXT,
  max_tokens INTEGER,
  supports_streaming BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on llm_models
ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;

-- Create policies for llm_models (read-only for all authenticated users)
CREATE POLICY "Enable read access for all users" ON public.llm_models
FOR SELECT USING (auth.role() = 'authenticated');

-- Populate llm_models with popular models
INSERT INTO public.llm_models (name, provider, description, max_tokens, supports_streaming) VALUES
('gpt-4o', 'OpenAI', 'GPT-4o - Latest multimodal model', 128000, true),
('gpt-4o-mini', 'OpenAI', 'GPT-4o Mini - Fast and efficient', 128000, true),
('gpt-4-turbo', 'OpenAI', 'GPT-4 Turbo - High performance', 128000, true),
('claude-3-5-sonnet-20241022', 'Anthropic', 'Claude 3.5 Sonnet - Latest version', 200000, true),
('claude-3-5-haiku-20241022', 'Anthropic', 'Claude 3.5 Haiku - Fast and efficient', 200000, true),
('claude-3-opus-20240229', 'Anthropic', 'Claude 3 Opus - Most capable', 200000, true),
('gemini-2.0-flash-exp', 'Google', 'Gemini 2.0 Flash - Experimental', 1000000, true),
('gemini-1.5-pro', 'Google', 'Gemini 1.5 Pro - Advanced reasoning', 2000000, true),
('gemini-1.5-flash', 'Google', 'Gemini 1.5 Flash - Fast responses', 1000000, true),
('deepseek-v3', 'DeepSeek', 'DeepSeek V3 - Latest model', 64000, true),
('deepseek-chat', 'DeepSeek', 'DeepSeek Chat - Conversational', 32000, true);

-- Create trigger for automatic timestamp updates on llm_models
CREATE TRIGGER update_llm_models_updated_at
BEFORE UPDATE ON public.llm_models
FOR EACH ROW
EXECUTE FUNCTION public.update_session_contexts_updated_at();