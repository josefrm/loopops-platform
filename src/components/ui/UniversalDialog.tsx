import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DialogControlProvider,
  useDialogControl,
} from '@/contexts/DialogControlContext';
import { getAllAgentsBackgroundStyle } from '@/utils/colors';
import React, { useEffect } from 'react';

interface UniversalDialogProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  backgroundStyle?: React.CSSProperties;
  closeButtonStyle?: React.CSSProperties; // Direct prop for close button styling
  showLogo?: boolean;
  fullScreen?: boolean;
  allowChildControl?: boolean; // New prop to enable child component control
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Inner component that has access to DialogControlContext
const DialogInner: React.FC<
  Omit<UniversalDialogProps, 'allowChildControl'>
> = ({
  title: propTitle,
  subtitle: propSubtitle,
  children,
  className = '',
  contentClassName = '',
  backgroundStyle,
  closeButtonStyle: propCloseButtonStyle,
  showLogo = true,
  fullScreen = true,
  open: propOpen,
  onOpenChange: propOnOpenChange,
}) => {
  const {
    dialogTitle,
    dialogBackgroundStyle,
    dialogTitleStyle,
    dialogCloseStyle,
    dialogHeaderBackgroundStyle,
    dialogCloseIcon,
    dialogCloseHandler,
    dialogChildren,
    isDialogOpen,
    setDialogTitle,
    setDialogSubtitle,
    setDialogBackgroundStyle,
    setDialogCloseStyle,
    closeDialog,
    setDialogCloseHandler, // Need this to sync close handler
  } = useDialogControl();

  // Initialize context with prop values
  useEffect(() => {
    if (propTitle) setDialogTitle(propTitle);
    if (propSubtitle) setDialogSubtitle(propSubtitle);
    if (backgroundStyle) setDialogBackgroundStyle(backgroundStyle);
    if (propCloseButtonStyle) setDialogCloseStyle(propCloseButtonStyle);
  }, [
    propTitle,
    propSubtitle,
    backgroundStyle,
    propCloseButtonStyle,
    setDialogTitle,
    setDialogSubtitle,
    setDialogBackgroundStyle,
    setDialogCloseStyle,
  ]);

  // Sync close handler if onOpenChange is provided
  useEffect(() => {
    if (propOnOpenChange) {
      setDialogCloseHandler(() => propOnOpenChange(false));
    }
  }, [propOnOpenChange, setDialogCloseHandler]);

  const getDialogStyle = () => {
    // Priority: dialogBackgroundStyle (from children) > backgroundStyle (from props) > default black gradient
    if (Object.keys(dialogBackgroundStyle).length > 0)
      return dialogBackgroundStyle;
    if (backgroundStyle) return backgroundStyle;
    return getAllAgentsBackgroundStyle();
  };

  const getDialogClassName = () => {
    if (fullScreen) {
      return `p-0 gap-0 w-[100vw] h-full !max-w-none text-white flex flex-col border-none ${contentClassName}`;
    }
    return `max-w-7xl max-h-[90vh] overflow-y-auto text-white ${contentClassName}`;
  };

  // Use dynamic titles from context if available, otherwise fall back to props
  const displayTitle = dialogTitle || propTitle;

  const handleOpenChange = (open: boolean) => {
    if (propOnOpenChange) {
      propOnOpenChange(open);
    }

    if (!open) {
      // When dialog is being closed, trigger the close handler or default close
      if (dialogCloseHandler) {
        dialogCloseHandler();
      } else {
        closeDialog();
      }
    }
  };

  // Determine if dialog should be open
  // If propOpen is provided (controlled), use it.
  // Otherwise use isDialogOpen from context (uncontrolled/child-controlled).
  // Note: When using allowChildControl=true, we might want to respect both.
  // Generally: if controlled from outside, that wins.
  const effectiveOpen = propOpen !== undefined ? propOpen : isDialogOpen;

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`${getDialogClassName()} ${className}`}
        style={getDialogStyle()}
        closeIcon={dialogCloseIcon}
        onCloseClick={dialogCloseHandler}
        closeButtonStyle={dialogCloseStyle} // Pass close button style
      >
        {displayTitle || showLogo ? (
          <DialogHeader
            className="flex-shrink-0"
            style={{
              backgroundColor: 'transparent',
              ...dialogHeaderBackgroundStyle,
            }}
          >
            <DialogTitle style={dialogTitleStyle}>
              {/* <div className="flex items-center space-x-loop-2 h-loop-10">
                {showLogo && (
                  <img
                    src="/images/loopops_icons/loopops_black.svg"
                    alt="LoopOps"
                    className="h-7 w-auto"
                  />
                )}
                {displayTitle && (
                  <h2 className="text-lg font-bold" style={dialogTitleStyle}>
                    {displayTitle}
                  </h2>
                )}
              </div> */}
            </DialogTitle>
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">Dialog</DialogTitle>
        )}

        <div
          className={`${fullScreen ? 'flex-1 overflow-y-hidden min-h-0' : ''}`}
        >
          {dialogChildren || children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const UniversalDialog: React.FC<UniversalDialogProps> = ({
  allowChildControl = true,
  ...props
}) => {
  if (allowChildControl) {
    return (
      <DialogControlProvider
        initialTitle={props.title}
        initialSubtitle={props.subtitle}
        initialBackgroundStyle={props.backgroundStyle}
      >
        <DialogInner {...props} />
      </DialogControlProvider>
    );
  }

  // If child control is disabled, render without the context provider
  return <DialogInner {...props} />;
};
