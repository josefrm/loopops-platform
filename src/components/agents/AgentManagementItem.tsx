import { AgentAvatar } from '@/components/ui/agents/AgentAvatar';
import { LLMModelSelector } from '@/components/ui/LLMModelSelector';
import { SwitchOptions } from '@/components/ui/SwitchOptions';
import { Agent as AgentModel } from '@/models/Agent';
import { ChevronLeft, HistoryIcon, Pencil } from 'lucide-react';
import React, { useState } from 'react';
import { ActionableText } from '../ui/ActionableText';
import { Integrations } from '../ui/Integrations';
import { Label } from '../ui/label';

interface Agent extends AgentModel {
  description: string;
}

interface AgentManagementItemProps {
  agent: Agent;
  isActive?: boolean;
  initialSection?: 'overview' | 'configure-prompt';
}

export const AgentManagementItem: React.FC<AgentManagementItemProps> = ({
  agent,
  isActive = false,
  initialSection = 'overview',
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [activeIntegrations, setActiveIntegrations] = useState<string[]>([
    'jira',
    'github',
    'figma',
  ]); // Default active integrations
  const [currentSection, setCurrentSection] = useState<
    'overview' | 'configure-prompt'
  >(initialSection);
  const [agentPrompt, setAgentPrompt] = useState<string>(agent.prompt || '');
  const [isSaving, setIsSaving] = useState(false);
  const [switchOptions, setSwitchOptions] = useState([
    { id: 'active', label: 'Active Agent', checked: true },
    { id: 'knowledge', label: 'Knowledge base', checked: true },
    { id: 'internet', label: 'Internet Access', checked: true },
  ]);

  // Update current section when initialSection prop changes
  React.useEffect(() => {
    setCurrentSection(initialSection);
  }, [initialSection]);

  const handleSwitchToggle = (id: string, checked: boolean) => {
    setSwitchOptions((prev) =>
      prev.map((option) =>
        option.id === id ? { ...option, checked } : option,
      ),
    );
  };

  const handleConfigurePrompt = () => {
    setCurrentSection('configure-prompt');
  };

  const handleBackToOverview = () => {
    setCurrentSection('overview');
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Mock save function
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Saving agent prompt:', agentPrompt);
    console.log('Saving active integrations:', activeIntegrations);
    console.log('Saving switch options:', switchOptions);
    console.log('Saving selected model:', selectedModel);
    setIsSaving(false);
    // Optionally go back to overview after save
    // setCurrentSection('overview');
  };

  return (
    <div
      className={`h-full transition-all duration-300 ${
        isActive
          ? 'border-none bg-transparent text-white shadow-lg'
          : 'border-none bg-transparent text-white shadow-sm'
      }`}
    >
      <div className="flex flex-col h-full">
        {currentSection === 'configure-prompt' && (
          <div className="flex justify-between">
            <AgentAvatar
              agent={agent}
              size="xl"
              className="mb-0"
              nameClassName="text-[18px] font-semibold text-white"
            >
              <ActionableText
                ref={null}
                text="BACK"
                icon={ChevronLeft}
                onClick={handleBackToOverview}
                textClassName="text-sm"
                iconClassName="w-4 h-4"
              />
            </AgentAvatar>
          </div>
        )}

        {currentSection === 'overview' && (
          <div className="grid grid-cols-2 space-x-loop-10 flex-1">
            {/* First Column - AgentAvatar and Team Section */}
            <div className="flex flex-col space-y-loop-10">
              <div className="space-y-loop-4">
                <AgentAvatar
                  agent={agent}
                  size="xl"
                  className="w-auto mb-0"
                  nameClassName="text-[18px] font-semibold text-white"
                >
                  <ActionableText
                    ref={null}
                    text="COMPLEMENTARY ACTION"
                    icon={Pencil}
                    onClick={handleConfigurePrompt}
                    textClassName="text-sm"
                    iconClassName="w-4 h-4"
                  />
                </AgentAvatar>
                <p className="text-lg font-normal text-white">
                  I handle everything related to the user interface and
                  front-end experience.
                </p>
              </div>

              {/* Teams Section */}
              <div className="space-y-loop-6">
                <div className="space-y-loop-1">
                  <Label
                    htmlFor="llm_model"
                    className="text-white text-md font-normal text-neutral-grayscale-40"
                  >
                    AI Model
                  </Label>
                  <LLMModelSelector
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    placeholder="Select model"
                    className="bg-transparent text-white border-gray-600"
                  />
                </div>

                {/* Toggles Section */}
                <SwitchOptions
                  options={switchOptions}
                  onToggle={handleSwitchToggle}
                  switchColor="bg-blue-600"
                  backgroundColor={agent.color || '#0F0F0F'}
                />

                {/* Integrations Section */}
                <Integrations
                  defaultActiveIntegrations={activeIntegrations}
                  onActiveIntegrationsChange={(activeIds) => {
                    setActiveIntegrations(activeIds);
                  }}
                />
              </div>
            </div>

            {/* Second Column - Capabilities and Rules */}
            <div className="flex flex-col">
              {/* Agent Capabilities */}
              <div className="space-y-loop-4">
                <h4 className="text-[18px] font-bold text-white">
                  Agent Capabilities
                </h4>
                <div className="text-base text-neutral-grayscale-30 space-y-loop-4">
                  <p>
                    Design Alignment: Confirms that the ticket includes a
                    reference to an approved design and matches the design
                    system components.
                  </p>
                  <ul className="max-w-md space-y-loop-4 text-neutral-grayscale-30 list-disc list-inside dark:text-gray-400">
                    <li>UI components and responsive design</li>
                    <li>Front-end frameworks (React, Vue, etc.)</li>
                    <li>Accessibility and performance best practices</li>
                    <li>
                      Component Reuse: Checks if an existing component can be
                      reused before approving a new one.
                    </li>
                    <li>
                      Naming Conventions: Ensures that proposed names for
                      components or classes follow the system’s naming rules.
                    </li>
                    <li>
                      Responsiveness: Verifies that the design accommodates
                      different breakpoints or explicitly defines desktop/mobile
                      behavior.
                    </li>
                    <li>
                      Technical Feasibility: Flags any unrealistic or overly
                      complex UI behavior for review with tech.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentSection === 'configure-prompt' && (
          <div className="space-y-loop-6 mt-loop-6">
            {/* Agent Prompt Section */}
            <div className="flex-1 space-y-loop-1">
              <Label
                htmlFor="agent_prompt"
                className="text-white text-md font-normal text-neutral-grayscale-40"
              >
                Agent System Prompt
              </Label>
              <div className="space-y-loop-2">
                <textarea
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Enter detailed instructions for this agent..."
                  className="w-[98%] h-[300px] p-loop-2 mx-loop-1 bg-transparent border border-slate-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-grayscale-30 placeholder-slate-400 text-md"
                />
                <label className="block text-md font-medium text-neutral-grayscale-50">
                  Note: this agent has company guidelines and knowledge that are
                  ready-only.
                </label>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-6">
                <ActionableText
                  ref={null}
                  text="RESET TO DEFAULT PROMPT"
                  icon={HistoryIcon}
                  onClick={() => {}}
                  textClassName="text-sm"
                  iconClassName="w-4 h-4"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !agentPrompt.trim()}
                  className="flex h-10 px-8 justify-center items-center space-x-loop-2 rounded-[26.5px] bg-white text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Agent’s Prompt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
