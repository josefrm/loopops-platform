import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useIntegrationsStore } from '@/stores/integrationsStore';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ExternalLink, Eye, Info } from 'lucide-react';
import React, { useState } from 'react';
import { IntegrationIcon } from '../ui/icons/IntegrationIcons';

interface IntegrationConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: {
    id: string;
    name: string;
    description: string;
    icon: string;
    connected: boolean;
  };
}

export const IntegrationConnectionModal: React.FC<
  IntegrationConnectionModalProps
> = ({ open, onOpenChange, integration }) => {
  const { toggleConnection, updateIntegration } = useIntegrationsStore();
  const [companyUrl, setCompanyUrl] = useState('https://cinemex.atlassian.net');
  const [userName, setUserName] = useState('edgar.askur@cinemex.com');
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

          <div className="flex items-center justify-between">
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

            <div className="flex gap-4 items-center">
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
