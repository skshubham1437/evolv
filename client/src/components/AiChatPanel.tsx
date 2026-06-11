import { useState, useEffect, useRef } from 'react';
import { useAI } from '../context/AIContext';
import { aiChat } from '../api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AiChatPanel() {
  const { isPanelOpen, closePanel, initialMessage, contextData, aiEnabled } = useAI();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPanelOpen) {
      // Reset chat when panel closes so next open is fresh
      setMessages([]);
      setInput('');
    }
  }, [isPanelOpen]);

  useEffect(() => {
    if (isPanelOpen && initialMessage) {
      setMessages([]);
      handleSend(initialMessage, contextData);
    }
  }, [isPanelOpen, initialMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!aiEnabled || !isPanelOpen) return null;


  const handleSend = async (text: string, ctx?: string) => {
    if (!text.trim()) return;
    
    const userMsg = { role: 'user' as const, content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await aiChat(text, ctx);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again or check your API key.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <div className="absolute right-0 top-0 h-full w-[400px] max-w-full bg-[var(--color-surface)] border-l border-[var(--color-outline-variant)] shadow-2xl flex flex-col slide-in-right pointer-events-auto">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--color-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">auto_awesome</span>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-on-surface-variant)]">AI Assistant</h3>
          </div>
          <button onClick={closePanel} className="w-7 h-7 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-outline)] gap-2 opacity-60">
              <span className="material-symbols-outlined text-[36px]">smart_toy</span>
              <p className="text-center text-[12px] font-mono tracking-wide">BREAK DOWN GOALS · REFLECT · PLAN</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 max-w-[90%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              <div className={`w-6 h-6 flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]' : 'border-[var(--color-primary)]/30 text-[var(--color-primary)]'}`}>
                <span className="material-symbols-outlined text-[14px]">
                  {msg.role === 'user' ? 'person' : 'auto_awesome'}
                </span>
              </div>
              <div className={`px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]' 
                  : 'bg-[var(--color-primary)]/5 text-[var(--color-on-surface)] border border-[var(--color-primary)]/20'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="self-start flex gap-2.5 max-w-[90%]">
              <div className="w-6 h-6 flex items-center justify-center shrink-0 border border-[var(--color-primary)]/30 text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              </div>
              <div className="px-3 py-2.5 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-[var(--color-primary)] animate-pulse tracking-wider">THINKING...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex gap-2"
          >
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask the assistant..."
              className="flex-1 bg-[var(--color-surface-container)] px-3 py-2.5 outline-none border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[13px] text-[var(--color-on-surface)] transition-colors placeholder:text-[var(--color-outline)]"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
