import React, { useState, useEffect } from 'react';
import { FilterableSelect } from '@/components/ui/FilterableSelect';
import { supabase } from '@/integrations/supabase/client';

interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

interface LLMModelOption {
  value: string;
  label: string;
  description?: string;
}

interface LLMModelSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const LLMModelSelector: React.FC<LLMModelSelectorProps> = ({
  value,
  onValueChange,
  placeholder = 'Select model',
  className,
  disabled = false,
}) => {
  const [models, setModels] = useState<LLMModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: functionError } =
          await supabase.functions.invoke('get-llm-models');

        if (functionError) {
          throw new Error(`Failed to fetch models: ${functionError.message}`);
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        const llmModels: LLMModel[] = data?.models || [];

        // Transform models to filterable select options
        const modelOptions: LLMModelOption[] = llmModels.map((model) => ({
          value: model.id, // Use model ID as the value for form submission
          label: `${model.name} (${model.provider})`,
          description: model.description,
        }));

        setModels(modelOptions);
      } catch (err) {
        console.error('Error fetching LLM models:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch models');

        // Fallback to hardcoded models in case of error
        const fallbackModels: LLMModelOption[] = [
          {
            value: 'gpt-4-fallback',
            label: 'GPT-4 (OpenAI)',
            description: 'OpenAI GPT-4 model',
          },
          {
            value: 'gpt-3.5-turbo-fallback',
            label: 'GPT-3.5 Turbo (OpenAI)',
            description: 'OpenAI GPT-3.5 Turbo model',
          },
          {
            value: 'claude-3-opus-fallback',
            label: 'Claude 3 Opus (Anthropic)',
            description: 'Anthropic Claude 3 Opus model',
          },
          {
            value: 'claude-3-sonnet-fallback',
            label: 'Claude 3 Sonnet (Anthropic)',
            description: 'Anthropic Claude 3 Sonnet model',
          },
          {
            value: 'claude-3-haiku-fallback',
            label: 'Claude 3 Haiku (Anthropic)',
            description: 'Anthropic Claude 3 Haiku model',
          },
        ];
        setModels(fallbackModels);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  return (
    <FilterableSelect
      value={value}
      onValueChange={onValueChange}
      options={models}
      placeholder={loading ? 'Loading models...' : placeholder}
      searchPlaceholder="Type to search models..."
      emptyMessage={error ? 'Failed to load models' : 'No models found'}
      variant="dark"
      className={className}
      disabled={disabled || loading}
      triggerClassName="!border !border-neutral-grayscale-40 !rounded-[8px]"
    />
  );
};
