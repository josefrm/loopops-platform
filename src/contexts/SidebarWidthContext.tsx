import React, { createContext, useContext, useState } from 'react';

interface SidebarWidthContextType {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  milestonesSidebarWidth: number;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setMilestonesSidebarWidth: (width: number) => void;
}

const SidebarWidthContext = createContext<SidebarWidthContextType | undefined>(
  undefined,
);

export const useSidebarWidth = (): SidebarWidthContextType => {
  const context = useContext(SidebarWidthContext);
  if (!context) {
    throw new Error('useSidebarWidth must be used within SidebarWidthProvider');
  }
  return context;
};

interface SidebarWidthProviderProps {
  children: React.ReactNode;
}

export const SidebarWidthProvider: React.FC<SidebarWidthProviderProps> = ({
  children,
}) => {
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(80);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(80);
  const [milestonesSidebarWidth, setMilestonesSidebarWidth] = useState(80);

  return (
    <SidebarWidthContext.Provider
      value={{
        leftSidebarWidth,
        rightSidebarWidth,
        milestonesSidebarWidth,
        setLeftSidebarWidth,
        setRightSidebarWidth,
        setMilestonesSidebarWidth,
      }}
    >
      {children}
    </SidebarWidthContext.Provider>
  );
};
