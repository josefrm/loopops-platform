import { ControlButton } from '@/components/ui/ControlButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import React from 'react';

interface DeleteArtifactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteArtifactModal: React.FC<DeleteArtifactModalProps> = ({
  open,
  onOpenChange,
  fileName,
  onConfirm,
  isDeleting = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[441px] p-loop-8">
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-bold text-gray-900 pr-8">
            Remove from Artifacts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-loop-4">
          <p className="text-base font-normal">
            Remove <span className="text-brand-accent-50">"{fileName}"</span>{' '}
            from Project Artifacts?
            <br />
            This won't delete your file in the Mindspace.
          </p>

          {/* Confirmation Text */}
          <p className="!mt-loop-6 text-base">
            <span className="font-bold text-gray-900">Are you sure?</span>
          </p>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <ControlButton
              type="transparent_brand"
              size="lg"
              text="Cancel"
              onClick={() => onOpenChange(false)}
              className="!w-[160px]"
              disabled={isDeleting}
            />
            <ControlButton
              type="default"
              size="lg"
              text={isDeleting ? 'Removing...' : 'Remove'}
              onClick={onConfirm}
              className="!w-[204px]"
              disabled={isDeleting}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
