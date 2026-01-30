import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DialogControlContextType {
  dialogTitle: string;
  dialogSubtitle: string;
  dialogBackgroundStyle: React.CSSProperties;
  dialogTitleStyle: React.CSSProperties; // Add title styling
  dialogCloseStyle: React.CSSProperties; // Add close button styling
  dialogHeaderBackgroundStyle: React.CSSProperties; // Add header background styling
  dialogCloseIcon: 'x' | 'arrow-left';
  dialogCloseHandler: (() => void) | null;
  dialogChildren: React.ReactNode | null; // Add dialog children state
  isDialogOpen: boolean; // Add dialog open state
  setDialogTitle: (title: string) => void;
  setDialogSubtitle: (subtitle: string) => void;
  setDialogBackgroundStyle: (style: React.CSSProperties) => void;
  setDialogTitleStyle: (style: React.CSSProperties) => void; // Add setter for title style
  setDialogCloseStyle: (style: React.CSSProperties) => void; // Add setter for close style
  setDialogHeaderBackgroundStyle: (style: React.CSSProperties) => void; // Add setter for header background style
  setDialogCloseIcon: (icon: 'x' | 'arrow-left') => void;
  setDialogCloseHandler: (handler: (() => void) | null) => void;
  setDialogChildren: (children: React.ReactNode | null) => void; // Add set children function
  openDialog: () => void; // Add open dialog function
  openDialogWithChildren: (children: React.ReactNode) => void; // Convenience function
  closeDialog: () => void; // Add close dialog function
  resetDialogBackground: () => void;
  resetDialogClose: () => void;
}

const DialogControlContext = createContext<
  DialogControlContextType | undefined
>(undefined);

interface DialogControlProviderProps {
  children: ReactNode;
  initialTitle?: string;
  initialSubtitle?: string;
  initialBackgroundStyle?: React.CSSProperties;
}

export const DialogControlProvider: React.FC<DialogControlProviderProps> = ({
  children,
  initialTitle = '',
  initialSubtitle = '',
  initialBackgroundStyle = {},
}) => {
  const [dialogTitle, setDialogTitle] = useState(initialTitle);
  const [dialogSubtitle, setDialogSubtitle] = useState(initialSubtitle);
  const [dialogBackgroundStyle, setDialogBackgroundStyle] = useState(
    initialBackgroundStyle,
  );
  const [dialogTitleStyle, setDialogTitleStyle] = useState<React.CSSProperties>(
    {},
  ); // Add title style state
  const [dialogCloseStyle, setDialogCloseStyle] = useState<React.CSSProperties>(
    {},
  ); // Add close style state
  const [dialogHeaderBackgroundStyle, setDialogHeaderBackgroundStyle] =
    useState<React.CSSProperties>({}); // Add header background style state
  const [dialogCloseIcon, setDialogCloseIcon] = useState<'x' | 'arrow-left'>(
    'x',
  );
  const [dialogCloseHandler, setDialogCloseHandlerState] = useState<
    (() => void) | null
  >(null);

  // Custom setter that properly handles functions without executing them
  const setDialogCloseHandler = (handler: (() => void) | null) => {
    // Use functional form to prevent React from treating the function as an updater
    setDialogCloseHandlerState(() => handler);
  };
  const [dialogChildren, setDialogChildren] = useState<React.ReactNode | null>(
    null,
  ); // Add dialog children state
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Add dialog open state

  const resetDialogBackground = () => {
    setDialogBackgroundStyle({});
  };

  const resetDialogClose = () => {
    setDialogCloseIcon('x');
    setDialogCloseHandler(null);
  };

  const resetDialogContent = () => {
    setDialogChildren(null);
  };

  // Default close handler that sets isDialogOpen to false
  const defaultCloseHandler = () => {
    setIsDialogOpen(false);
    resetDialogContent(); // Reset content when dialog closes
  };

  const openDialog = () => {
    console.log('Opening dialog');
    setIsDialogOpen(true);
  };

  const openDialogWithChildren = (children: React.ReactNode) => {
    setDialogChildren(children);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetDialogClose(); // Reset close state when dialog closes
    resetDialogContent(); // Reset content when dialog closes
  };

  const value: DialogControlContextType = {
    dialogTitle,
    dialogSubtitle,
    dialogBackgroundStyle,
    dialogTitleStyle,
    dialogCloseStyle,
    dialogHeaderBackgroundStyle,
    dialogCloseIcon,
    dialogCloseHandler: dialogCloseHandler
      ? dialogCloseHandler
      : defaultCloseHandler, // Use explicit ternary to avoid execution
    dialogChildren,
    isDialogOpen,
    setDialogTitle,
    setDialogSubtitle,
    setDialogBackgroundStyle,
    setDialogTitleStyle,
    setDialogCloseStyle,
    setDialogHeaderBackgroundStyle,
    setDialogCloseIcon,
    setDialogCloseHandler,
    setDialogChildren,
    openDialog,
    openDialogWithChildren,
    closeDialog,
    resetDialogBackground,
    resetDialogClose,
  };

  return (
    <DialogControlContext.Provider value={value}>
      {children}
    </DialogControlContext.Provider>
  );
};

export const useDialogControl = (): DialogControlContextType => {
  const context = useContext(DialogControlContext);
  if (!context) {
    throw new Error(
      'useDialogControl must be used within a DialogControlProvider',
    );
  }
  return context;
};
