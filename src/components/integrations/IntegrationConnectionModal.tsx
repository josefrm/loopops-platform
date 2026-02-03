import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useIntegrationsStore, type Integration } from '@/stores/integrationsStore';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ExternalLink, Eye, Info, Sparkles, Copy, Check } from 'lucide-react';
import React, { useState } from 'react';
import { IntegrationIcon } from '../ui/icons/IntegrationIcons';
import { useGenerateCode } from '@/hooks/useIntegrations';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

interface IntegrationConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: Integration;
}

export const IntegrationConnectionModal: React.FC<
  IntegrationConnectionModalProps
> = ({ open, onOpenChange, integration }) => {
  const { toggleConnection, updateIntegration } = useIntegrationsStore();
  const [companyUrl, setCompanyUrl] = useState('https://cinemex.atlassian.net');
  const [userName, setUserName] = useState('edgar.askur@cinemex.com');
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    expires_at: string;
  } | null>(null);
  
  const isPromptType = integration.type === 'prompt';
  
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );

  const generateCodeMutation = useGenerateCode({
    integrationType: integration.id,
    onSuccess: (data) => {
      setGeneratedCode(data);
    },
  });

  const handleGenerateCode = () => {
    const workspaceId = currentWorkspace?.id || selectedProject?.workspace_id;
    
    if (!selectedProject?.id || !workspaceId) {
      return;
    }

    generateCodeMutation.mutate({
      project_id: selectedProject.id,
      workspace_id: workspaceId,
    });
  };

  const handleCopy = () => {
    if (generatedCode?.code) {
      navigator.clipboard.writeText(generatedCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDisconnect = () => {
    toggleConnection(integration.id);
    onOpenChange(false);
  };

  const handleUpdate = () => {
    updateIntegration(integration.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[760px] p-0 gap-0 bg-white border-none rounded-[24px] shadow-[0px_8px_20px_0px_rgba(0,0,0,0.05)]"
        onCloseClick={() => onOpenChange(false)}
      >
        <VisuallyHidden>
          <DialogTitle>{integration.name} Connection Settings</DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-col gap-8 p-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex gap-3 items-center">
                <IntegrationIcon
                  type={integration.icon}
                  className="w-10 h-10"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <h2 className="font-bold text-[20px] leading-normal text-black">
                      {integration.name}
                    </h2>
                    {integration.connected && (
                      <div className="bg-[#40BF6A] px-3 py-1 rounded-full">
                        <p className="font-bold text-[11px] leading-normal tracking-[-0.33px] text-white">
                          Connected
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="font-normal text-[16px] leading-normal tracking-[-0.48px] text-[#0F0F0F]">
                    {integration.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isPromptType ? (
            <div className="flex flex-col gap-4">
              <p className="font-bold text-[14px] leading-normal text-[#0F0F0F]">
                Generate access code to connect {integration.name}
              </p>

              <div className="bg-[#F5E6FF] border border-[#BC43B2] rounded-[16px] p-4 shadow-[0px_8px_20px_0px_rgba(0,0,0,0.05)] flex gap-2.5 items-center">
                <Info className="w-6 h-6 text-[#BC43B2] shrink-0" />
                <p className="font-bold text-[13px] leading-normal text-[#BC43B2]">
                  Click "Generate Code" to create a temporary access code. Use this code in the {integration.name} plugin to connect to Loopops.
                </p>
              </div>

              {generatedCode ? (
                <div className="bg-gradient-to-br from-[#BC43B2]/5 to-[#9333EA]/5 border border-[#BC43B2]/30 rounded-[12px] p-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[14px] text-[#BC43B2] uppercase tracking-wide">
                        Your Access Code
                      </p>
                      <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200"
                        aria-label="Copy code"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-[#40BF6A] animate-in zoom-in duration-200" />
                        ) : (
                          <Copy className="w-5 h-5 text-[#BC43B2]" />
                        )}
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#BC43B2]/20">
                      <p className="font-mono text-[20px] font-bold text-[#0F0F0F] text-center break-all animate-in fade-in duration-300 delay-150">
                        {generatedCode.code}
                      </p>
                    </div>
                    <p className="font-normal text-[12px] text-[#666666] text-center animate-in fade-in duration-300 delay-300">
                      Expires: {formatExpiresAt(generatedCode.expires_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#BC43B2]/5 to-[#9333EA]/5 border border-[#BC43B2]/30 rounded-[12px] p-6">
                  <div className="flex flex-col gap-4 items-center text-center">
                    <div>
                      <p className="font-bold text-[16px] leading-normal text-[#0F0F0F] mb-1">
                        Ready to Connect
                      </p>
                      <p className="font-normal text-[13px] leading-normal text-[#666666]">
                        Generate a secure code to link your {integration.name} workspace
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateCode}
                      disabled={generateCodeMutation.isPending}
                      className="bg-[#BC43B2] rounded-[26.5px] px-6 py-3 flex items-center justify-center gap-2 hover:bg-[#A33A9E] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles
                        className={`w-4 h-4 text-white ${
                          generateCodeMutation.isPending ? 'animate-spin' : ''
                        }`}
                      />
                      <p className="font-bold text-[14px] leading-normal text-white">
                        {generateCodeMutation.isPending
                          ? 'Generating...'
                          : 'Generate Code'}
                      </p>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                <p className="font-bold text-[14px] leading-normal text-[#0F0F0F]">
                  Configure your {integration.name} connection settings below.
                </p>

                <div className="bg-[#D0E6FB] border border-[#2682D9] rounded-[16px] p-4 shadow-[0px_8px_20px_0px_rgba(0,0,0,0.05)] flex gap-2.5 items-center">
                  <Info className="w-6 h-6 text-[#1B5B98] shrink-0" />
                  <p className="font-bold text-[13px] leading-normal text-[#1B5B98]">
                    To get your API Key, go to: JIRA / Account Settings / Security /
                    API Tokens
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-normal text-[11px] leading-[13.3px] tracking-[-0.33px] text-[#666666] pl-4">
                    Company URL
                  </label>
                  <div className="bg-white border border-neutral-grayscale-30 rounded-full h-10 px-4 py-2 flex items-center justify-between">
                    <input
                      type="text"
                      value={companyUrl}
                      onChange={(e) => setCompanyUrl(e.target.value)}
                      className="font-normal text-[13px] leading-normal text-[#0F0F0F] flex-1 outline-none bg-transparent"
                    />
                    <Eye className="w-6 h-6 text-[#666666] cursor-pointer" />
                  </div>
                </div>

                <div className="flex gap-3.5">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="font-normal text-[11px] leading-[13.3px] tracking-[-0.33px] text-[#666666] pl-4">
                      User Name (Email)
                    </label>
                    <div className="bg-white border border-neutral-grayscale-30 rounded-full h-10 px-4 py-2 flex items-center justify-between">
                      <input
                        type="email"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="font-normal text-[13px] leading-normal text-[#0F0F0F] flex-1 outline-none bg-transparent"
                      />
                      <Eye className="w-6 h-6 text-[#666666] cursor-pointer" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    <label className="font-normal text-[11px] leading-[13.3px] tracking-[-0.33px] text-[#666666] pl-4">
                      API Key (optional: leave unchanged if not updating)
                    </label>
                    <div className="bg-white border border-neutral-grayscale-30 rounded-full h-10 px-4 py-2 flex items-center justify-between">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="・・・・・・・・・・・・・"
                        className="font-normal text-[13px] leading-normal text-[#0F0F0F] flex-1 outline-none bg-transparent"
                      />
                      <Eye
                        className="w-6 h-6 text-[#666666] cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            {!isPromptType && (
              <div className="flex gap-4 items-center">
                <a
                  href="#"
                  className="flex gap-1 items-center group"
                  onClick={(e) => e.preventDefault()}
              >
                <ExternalLink className="w-6 h-6 text-[#666666]" />
                <p className="font-bold text-[11px] leading-normal tracking-[0.55px] text-[#666666] underline uppercase">
                  DOCUMENTATION
                </p>
              </a>
              <a
                href="#"
                className="flex gap-1 items-center group"
                onClick={(e) => e.preventDefault()}
              >
                <ExternalLink className="w-6 h-6 text-[#666666]" />
                <p className="font-bold text-[11px] leading-normal tracking-[0.55px] text-[#666666] underline uppercase">
                  GET THE API KEY
                </p>
              </a>
              </div>
            )}

            <div className="flex gap-4 items-center ml-auto">
              {isPromptType ? (
                <button
                  onClick={() => onOpenChange(false)}
                  className="bg-[#BC43B2] rounded-[26.5px] h-10 px-6 py-2 flex items-center justify-center hover:bg-[#A33A9E] transition-colors"
                >
                  <p className="font-bold text-[14px] leading-normal text-white">
                    Close
                  </p>
                </button>
              ) : (
                <>
                  {integration.connected && (
                    <button
                      onClick={handleDisconnect}
                      className="border border-[#BC43B2] rounded-[26.5px] h-10 px-6 py-2 flex items-center justify-center hover:bg-[#FFF5FE] transition-colors"
                    >
                      <p className="font-bold text-[14px] leading-normal text-[#BC43B2]">
                        Disconnect
                      </p>
                    </button>
                  )}
                  <button
                    onClick={handleUpdate}
                    className="bg-[#BC43B2] rounded-[26.5px] h-10 px-6 py-2 flex items-center justify-center hover:bg-[#A33A9E] transition-colors"
                  >
                    <p className="font-bold text-[14px] leading-normal text-white">
                      {integration.connected ? 'Update Connection' : 'Connect'}
                    </p>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
