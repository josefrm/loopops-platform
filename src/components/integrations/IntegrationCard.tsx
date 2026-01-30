import { useGenerateCode } from '@/hooks/useIntegrations';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { Check, Copy, ExternalLink, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { ActionableText } from '../ui/ActionableText';
import { IntegrationIcon } from '../ui/icons/IntegrationIcons';
import { IntegrationConnectionModal } from './IntegrationConnectionModal';

export interface IntegrationCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  type?: 'integration' | 'prompt';
  prompt?: string;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  id,
  name,
  description,
  icon,
  connected,
  type = 'integration',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    expires_at: string;
  } | null>(null);

  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );

  const generateCodeMutation = useGenerateCode({
    integrationType: id,
    onSuccess: (data) => {
      setGeneratedCode(data);
    },
  });

  const handleConnect = () => {
    setShowModal(true);
  };

  const handleDisconnect = () => {
    setShowModal(true);
  };

  const handleUpdate = () => {
    setShowModal(true);
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

  const handleGenerateCode = () => {
    if (!selectedProject?.id || !currentWorkspace?.id) {
      console.error('Project or workspace not selected');
      return;
    }

    generateCodeMutation.mutate({
      project_id: selectedProject.id,
      workspace_id: currentWorkspace.id,
    });
  };

  const integration = { id, name, description, icon, connected };
  return (
    <div className="bg-white border border-neutral-grayscale-30 rounded-[12px] sm:rounded-[14px] lg:rounded-[16px] p-4 sm:p-5 lg:p-6 shadow-[0px_8px_20px_0px_rgba(0,0,0,0.05)] flex flex-col h-full hover:shadow-[0px_12px_24px_0px_rgba(0,0,0,0.08)] transition-all duration-300">
      <div className="flex flex-col gap-3 sm:gap-3.5 lg:gap-4 h-full">
        <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
          <div className="flex items-center pt-1 shrink-0">
            <IntegrationIcon
              type={icon}
              className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10"
            />
          </div>

          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex gap-2 items-center flex-wrap">
              <p className="font-bold text-[14px] sm:text-[15px] lg:text-[16px] leading-normal tracking-[-0.48px] text-black truncate">
                {name}
              </p>
              {type === 'integration' &&
                (connected ? (
                  <div className="bg-[#40BF6A] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full flex gap-2.5 items-center justify-center shrink-0">
                    <p className="font-bold text-[10px] sm:text-[11px] leading-normal tracking-[-0.33px] text-white text-center whitespace-nowrap">
                      Connected
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#EEEEEE] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full flex gap-2.5 items-center justify-center shrink-0">
                    <p className="font-bold text-[9px] sm:text-[10px] leading-normal tracking-[0px] text-[#999999] text-center whitespace-nowrap">
                      Not connected
                    </p>
                  </div>
                ))}
            </div>

            <div className="min-h-[30px] sm:min-h-[32px] lg:min-h-[34px]">
              <p className="font-normal text-[12px] sm:text-[13px] lg:text-[14px] leading-snug tracking-[0px] text-[#666666] line-clamp-2">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Generated Code Section for Prompt Type */}
        {type === 'prompt' && generatedCode && (
          <div className="bg-gradient-to-br from-[#BC43B2]/5 to-[#9333EA]/5 border border-[#BC43B2]/30 rounded-[6px] sm:rounded-[8px] p-2.5 sm:p-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-bold text-[10px] sm:text-[11px] text-[#BC43B2] uppercase tracking-wide">
                Generated Code
              </p>
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-white/60 rounded transition-all duration-200"
                aria-label="Copy code"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[#40BF6A] animate-in zoom-in duration-200" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#BC43B2]" />
                )}
              </button>
            </div>
            <p className="font-mono text-[15px] sm:text-[16px] font-bold text-[#0F0F0F] mb-1.5 break-all animate-in fade-in duration-300 delay-150">
              {generatedCode.code}
            </p>
            <p className="font-normal text-[9px] sm:text-[10px] text-[#666666] animate-in fade-in duration-300 delay-300">
              Expires: {formatExpiresAt(generatedCode.expires_at)}
            </p>
          </div>
        )}

        <div className="h-0 border-t border-neutral-grayscale-30" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
          <div className="flex gap-2 flex-wrap">
            <ActionableText
              text="DOCU"
              icon={ExternalLink}
              onClick={() => {}}
              iconClassName="w-5 h-5 sm:w-6 sm:h-6 text-[#666666]"
              textClassName="font-bold text-[10px] sm:text-[11px] leading-normal tracking-[0.55px] text-[#666666] uppercase"
            />
            <ActionableText
              text="API"
              icon={ExternalLink}
              onClick={() => {}}
              iconClassName="w-5 h-5 sm:w-6 sm:h-6 text-[#666666]"
              textClassName="font-bold text-[10px] sm:text-[11px] leading-normal tracking-[0.55px] text-[#666666] uppercase"
            />
          </div>

          <div className="flex gap-2 items-center justify-end w-full sm:w-auto">
            {type === 'prompt' ? (
              <button
                onClick={handleGenerateCode}
                disabled={generateCodeMutation.isPending}
                className="bg-[#BC43B2] rounded-[20px] sm:rounded-[24px] lg:rounded-[26.5px] px-3 sm:px-3.5 lg:px-4 py-1.5 sm:py-2 h-7 sm:h-8 min-w-[85px] sm:min-w-[100px] flex items-center justify-center gap-1.5 hover:bg-[#A33A9E] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-white ${
                    generateCodeMutation.isPending ? 'animate-spin' : ''
                  }`}
                />
                <p className="font-bold text-[10px] sm:text-[11px] leading-normal tracking-[-0.33px] text-white">
                  {generateCodeMutation.isPending
                    ? 'Generating...'
                    : 'Generate Code'}
                </p>
              </button>
            ) : connected ? (
              <>
                <button
                  onClick={handleDisconnect}
                  className="border border-[#0F0F0F] rounded-[20px] sm:rounded-[24px] lg:rounded-[26.5px] px-3 sm:px-3.5 lg:px-4 py-1.5 sm:py-2 h-7 sm:h-8 min-w-[70px] sm:min-w-[80px] flex items-center justify-center hover:bg-[#F5F5F5] transition-colors"
                >
                  <p className="font-normal text-[10px] sm:text-[11px] leading-[13.3px] tracking-[-0.33px] text-[#0F0F0F] text-center">
                    Disconnect
                  </p>
                </button>
                <button
                  onClick={handleUpdate}
                  className="bg-[#BC43B2] rounded-[20px] sm:rounded-[24px] lg:rounded-[26.5px] px-3 sm:px-3.5 lg:px-4 py-1.5 sm:py-2 h-7 sm:h-8 min-w-[70px] sm:min-w-[80px] flex items-center justify-center hover:bg-[#A33A9E] transition-colors"
                >
                  <p className="font-bold text-[10px] sm:text-[11px] leading-normal tracking-[-0.33px] text-white text-center">
                    Update
                  </p>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="bg-[#BC43B2] rounded-[20px] sm:rounded-[24px] lg:rounded-[26.5px] px-3 sm:px-3.5 lg:px-4 py-1.5 sm:py-2 h-7 sm:h-8 min-w-[70px] sm:min-w-[80px] flex items-center justify-center hover:bg-[#A33A9E] transition-colors"
              >
                <p className="font-bold text-[10px] sm:text-[11px] leading-normal tracking-[-0.33px] text-white text-center">
                  Connect
                </p>
              </button>
            )}
          </div>
        </div>
      </div>

      <IntegrationConnectionModal
        open={showModal}
        onOpenChange={setShowModal}
        integration={integration}
      />
    </div>
  );
};
