import { createContext, useContext, useState, type ReactNode } from 'react';

interface AIContextProps {
  isPanelOpen: boolean;
  openPanel: (initialMessage?: string, contextData?: string) => void;
  closePanel: () => void;
  initialMessage: string;
  contextData: string;
}

const AIContext = createContext<AIContextProps | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [contextData, setContextData] = useState('');

  const openPanel = (msg: string = '', ctx: string = '') => {
    setInitialMessage(msg);
    setContextData(ctx);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setInitialMessage('');
    setContextData('');
  };

  return (
    <AIContext.Provider value={{ isPanelOpen, openPanel, closePanel, initialMessage, contextData }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
