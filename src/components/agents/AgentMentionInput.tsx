import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Bot } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  avatar?: string;
}

interface AgentMentionInputProps {
  onSendMessage: (message: string, mentionedAgent?: Agent) => void;
  disabled?: boolean;
}

const AVAILABLE_AGENTS: Agent[] = [
  { id: 'support', name: 'Support Agent' },
  { id: 'sales', name: 'Sales Agent' },
  { id: 'technical', name: 'Technical Agent' },
  { id: 'product', name: 'Product Agent' },
];

export const AgentMentionInput: React.FC<AgentMentionInputProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [showAgentList, setShowAgentList] = useState(false);
  const [mentionedAgent, setMentionedAgent] = useState<Agent | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setMessage(value);
    setCursorPosition(cursorPos);

    // Check if user typed @ to show agent list
    const lastChar = value[cursorPos - 1];
    if (lastChar === '@') {
      setShowAgentList(true);
    } else if (
      showAgentList &&
      (lastChar === ' ' || lastChar === '\n' || value.length === 0)
    ) {
      setShowAgentList(false);
    }

    // Check for existing agent mentions
    const mentionMatch = value.match(/@(\w+)/);
    if (mentionMatch) {
      const agentName = mentionMatch[1].toLowerCase();
      const agent = AVAILABLE_AGENTS.find((a) =>
        a.name.toLowerCase().replace(' ', '').includes(agentName),
      );
      setMentionedAgent(agent || null);
    } else {
      setMentionedAgent(null);
    }
  };

  const selectAgent = (agent: Agent) => {
    const beforeAt = message.substring(0, message.lastIndexOf('@'));
    const afterCursor = message.substring(cursorPosition);
    const newMessage = `${beforeAt}@${agent.name.replace(' ', '')} ${afterCursor}`;

    setMessage(newMessage);
    setMentionedAgent(agent);
    setShowAgentList(false);

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), mentionedAgent || undefined);
      setMessage('');
      setMentionedAgent(null);
      setShowAgentList(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      {mentionedAgent && (
        <div className="mb-2 flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Bot className="w-3 h-3" />
            <span>Talking to: {mentionedAgent.name}</span>
          </Badge>
        </div>
      )}

      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... Use @ to mention an agent"
            className="w-full min-h-[44px] max-h-32 px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={disabled}
            rows={1}
          />

          {showAgentList && (
            <div className="absolute bottom-full left-0 w-64 bg-white border border-slate-200 rounded-lg shadow-lg mb-1 z-10">
              <div className="p-2 border-b border-slate-100">
                <p className="text-xs text-slate-600 font-medium">
                  Available Agents
                </p>
              </div>
              {AVAILABLE_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => selectAgent(agent)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <Bot className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{agent.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
