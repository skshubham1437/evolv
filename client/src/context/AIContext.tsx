import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { request, API_BASE } from '../api/core';
import { fetchAILimitStatus, type AILimitStatus } from '../api/ai';

interface AIContextProps {
  isPanelOpen: boolean;
  openPanel: (initialMessage?: string, contextData?: string) => void;
  closePanel: () => void;
  initialMessage: string;
  contextData: string;
  aiEnabled: boolean;
  aiLimit: AILimitStatus | null;
  refreshLimit: () => Promise<void>;
}

const AIContext = createContext<AIContextProps | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [contextData, setContextData] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLimit, setAiLimit] = useState<AILimitStatus | null>(null);

  const refreshLimit = async () => {
    try {
      const data = await fetchAILimitStatus();
      setAiLimit(data);
    } catch (err) {
      console.error('Failed to check AI rate limits:', err);
    }
  };

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

  useEffect(() => {
    if (aiEnabled) {
      refreshLimit();
    }
  }, [aiEnabled]);

  // Real-time client countdown for reset duration
  useEffect(() => {
    if (!aiLimit || aiLimit.reset_seconds <= 0) return;
    const interval = setInterval(() => {
      setAiLimit(prev => {
        if (!prev || prev.reset_seconds <= 0) return prev;
        return {
          ...prev,
          reset_seconds: Math.max(0, prev.reset_seconds - 1),
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [aiLimit?.reset_seconds]);

  const openPanel = (msg: string = '', ctx: string = '') => {
    setInitialMessage(msg);
    setContextData(ctx);
    setIsPanelOpen(true);
    refreshLimit(); // Refresh when panel opens
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setInitialMessage('');
    setContextData('');
  };

  return (
    <AIContext.Provider value={{ isPanelOpen, openPanel, closePanel, initialMessage, contextData, aiEnabled, aiLimit, refreshLimit }}>
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
