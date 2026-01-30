import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check, Copy, Key } from 'lucide-react';
import React, { useState } from 'react';

export const TokenDisplay: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const fetchToken = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch authentication token.',
          variant: 'destructive',
        });
        return;
      }

      if (session?.access_token) {
        setToken(session.access_token);
      } else {
        toast({
          title: 'No Token',
          description: 'No authentication token found. Please log in again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Token copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy token to clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchToken}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:from-amber-100 hover:to-orange-100"
        >
          <Key className="w-4 h-4 text-amber-600" />
          <span className="text-amber-700">Auth Token</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-amber-600" />
            <span>Authentication Token</span>
          </DialogTitle>
          <DialogDescription>
            Your current authentication token. Keep this secure and don't share
            it with others.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : token ? (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="font-mono text-sm break-all text-slate-700 max-h-32 overflow-y-auto">
                  {token}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Token</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Click the button above to fetch your authentication token.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
