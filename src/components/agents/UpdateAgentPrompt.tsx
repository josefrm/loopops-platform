import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Agent } from '@/models/Agent';
import { AgentToolsEditor } from './AgentToolsEditor';
import { AgentService } from '@/services/AgentService';

interface UpdateAgentPromptProps {
  agent: Agent;
  onBack: () => void;
  onSave?: (agentId: string, updatedPrompt: string) => void;
}

export const UpdateAgentPrompt: React.FC<UpdateAgentPromptProps> = ({
  agent,
  onBack,
  onSave,
}) => {
  const [prompt, setPrompt] = useState(agent.prompt || '');
  const [tools, setTools] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset prompt when agent changes
  useEffect(() => {
    setPrompt(agent.prompt || '');
  }, [agent.id, agent.prompt]);

  const handleSave = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Agent instructions cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update both prompt and tools via AgentService
      await AgentService.updateAgent({
        agent_id: agent.id,
        agent_prompt: prompt,
        tools: tools.length > 0 ? tools : undefined,
      });

      if (onSave) {
        await onSave(agent.id, prompt);
      }

      toast({
        title: 'Success',
        description: 'Agent updated successfully.',
      });
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-[120px] py-[60px] overflow-hidden">
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-semibold text-neutral-grayscale-30">
            Agent System Prompt
          </h3>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-neutral-grayscale-30 hover:text-slate-300 transition-colors"
          >
            {/* <ArrowLeft className="w-4 h-4" /> */}
            Back
          </button>
        </div>

        {/* Textarea for agent instructions */}
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter detailed instructions for this agent..."
            className="w-full h-80 p-4 bg-transparent border border-slate-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-grayscale-30 placeholder-slate-400 text-[13px]"
          />
          <label className="block text-[13px] font-medium text-neutral-grayscale-50">
            Note: this agent has company guidelines and knowledge that are
            ready-only.
          </label>
        </div>

        {/* Agent Tools Editor */}
        <div className="border-t border-slate-600 pt-6">
          <AgentToolsEditor agent={agent} onToolsChange={setTools} />
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !prompt.trim()}
            className="flex h-10 px-8 justify-center items-center gap-2 rounded-[26.5px] bg-white text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              display: 'flex',
              height: '40px',
              padding: '8px 32px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '26.5px',
              background: '#FFF',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
