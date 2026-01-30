import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Agent } from '@/models/Agent';
import { Figma, Github, Save, Wrench, X } from 'lucide-react';
import React, { useState } from 'react';

interface AgentPromptEditorProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentId: string, newPrompt: string) => void;
}

const llmModels = [
  { value: 'openai-gpt4', label: 'OpenAI GPT-4' },
  { value: 'openai-gpt4-turbo', label: 'OpenAI GPT-4 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'anthropic-claude-2', label: 'Anthropic Claude 2' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'gemini-ultra', label: 'Gemini Ultra' },
  { value: 'llama-2-70b', label: 'LLama 2 70B' },
  { value: 'llama-3-8b', label: 'LLama 3 8B' },
];

export const AgentPromptEditor: React.FC<AgentPromptEditorProps> = ({
  agent,
  isOpen,
  onClose,
}) => {
  const [selectedModel, setSelectedModel] = useState('openai-gpt4');
  const [, setTools] = useState<any[]>([]);

  React.useEffect(() => {
    if (agent) {
      setTools(agent.tools || []);
    }
  }, [agent]);

  // Mock tools data - in a real app this would come from the agent configuration
  const connectedTools = [
    { name: 'GitHub', icon: Github, connected: true },
    { name: 'Figma', icon: Figma, connected: agent?.id === 'design' },
    { name: 'Jenkins', icon: Wrench, connected: agent?.id === 'qa' },
  ];

  // Hardcoded system prompt that appears at the bottom
  const hardcodedPrompt = `

Context Guidelines:
- Always provide specific, actionable recommendations
- Use markdown formatting for better readability
- Include concrete next steps when analyzing tickets
- Consider team dynamics and project constraints
- Maintain professional and helpful tone`;

  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Label
                  htmlFor="model-select"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  LLM Model:
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model-select" className="w-[200px]">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {llmModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-6">
          {/* Connected Tools Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Connected Tools</Label>
            <div className="flex flex-wrap gap-2">
              {connectedTools.map((tool) => (
                <Badge
                  key={tool.name}
                  variant={tool.connected ? 'default' : 'secondary'}
                  className="flex items-center space-x-1 px-2 py-1"
                >
                  <tool.icon className="w-3 h-3" />
                  <span>{tool.name}</span>
                  {tool.connected && (
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* System Prompt Section */}
          <div className="flex-1 flex flex-col space-y-4">
            <Label htmlFor="prompt">System Prompt</Label>

            {/* Editable Prompt Area */}
            <div className="flex-1 flex flex-col space-y-2">
              <Label className="text-xs text-gray-600">Editable Section</Label>
              <Textarea
                id="prompt"
                className="min-h-[200px] font-mono text-sm resize-none"
                placeholder="Enter the custom system prompt for this agent..."
              />
            </div>

            {/* Non-editable Hardcoded Prompt */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">
                System Guidelines (Read-only)
              </Label>
              <Textarea
                value={hardcodedPrompt}
                readOnly
                className="min-h-[120px] font-mono text-sm bg-gray-50 text-gray-700 resize-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {}}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Agent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
