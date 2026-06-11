import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { request, API_BASE } from '../api/core';

interface AIContextProps {
  isPanelOpen: boolean;
  openPanel: (initialMessage?: string, contextData?: string) => void;
  closePanel: () => void;
  initialMessage: string;
  contextData: string;
  aiEnabled: boolean;
}

const AIContext = createContext<AIContextProps | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [contextData, setContextData] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await request<{ ai_enabled: boolean }>(`${API_BASE}/health`);
        setAiEnabled(!!data.ai_enabled);
      } catch (err) {
        console.error('Failed to check AI health status:', err);
        setAiEnabled(false);
      }
    }
    checkHealth();
  }, []);

  const openPanel = (msg: string = '', ctx: string = '') => {
    if (!aiEnabled) return; // Prevent opening panel if AI is disabled
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
    <AIContext.Provider value={{ isPanelOpen, openPanel, closePanel, initialMessage, contextData, aiEnabled }}>
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
