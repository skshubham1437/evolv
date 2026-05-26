import { useState, useEffect, useRef } from 'react';
import { useAI } from '../context/AIContext';
import { aiChat } from '../api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AiChatPanel() {
  const { isPanelOpen, closePanel, initialMessage, contextData } = useAI();
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

  if (!isPanelOpen) return null;


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
      <div className="absolute right-0 top-0 h-full w-[400px] max-w-full bg-[var(--color-surface)]/95 backdrop-blur-2xl border-l border-[var(--color-outline-variant)]/20 shadow-2xl flex flex-col slide-in-right pointer-events-auto">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-outline-variant)]/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--color-primary)]">
            <span className="material-symbols-outlined">auto_awesome</span>
            <h3 className="font-title-md font-bold text-[16px]">AI Assistant</h3>
          </div>
          <button onClick={closePanel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-outline)] gap-2 opacity-60">
              <span className="material-symbols-outlined text-[48px]">smart_toy</span>
              <p className="font-body-md text-center text-[13px]">I can help break down goals, reflect on your journals, or plan your week.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]' : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {msg.role === 'user' ? 'person' : 'auto_awesome'}
                </span>
              </div>
              <div className={`p-3 rounded-2xl font-body-md text-[14px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-tr-sm' 
                  : 'bg-[var(--color-primary)]/10 text-[var(--color-on-surface)] border border-[var(--color-primary)]/20 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="self-start flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-primary)]/20 text-[var(--color-primary)] animate-pulse">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-tl-sm flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[var(--color-outline-variant)]/10 bg-[var(--color-surface)]">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex gap-2"
          >
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask the assistant..."
              className="flex-1 bg-[var(--color-surface-container)] rounded-xl px-4 py-3 outline-none border border-transparent focus:border-[var(--color-primary)]/40 font-body-md text-[14px] text-[var(--color-on-surface)] transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 flex items-center justify-center bg-[var(--color-primary)] text-black rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
