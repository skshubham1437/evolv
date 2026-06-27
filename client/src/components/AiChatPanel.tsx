import { useState, useEffect, useRef } from 'react';
import { useAI } from '../context/AIContext';
import { aiChat } from '../api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  { icon: 'wb_sunny', text: 'What should I focus on today?' },
  { icon: 'bar_chart', text: 'Review my habit streaks' },
  { icon: 'flag',     text: 'Break down my top goal' },
  { icon: 'insights', text: 'How am I doing this week?' },
];

export function AiChatPanel() {
  const { isPanelOpen, closePanel, initialMessage, contextData, aiEnabled, aiLimit, refreshLimit } = useAI();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPanelOpen) {
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
      refreshLimit();
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <div className="absolute right-0 top-0 h-full w-[400px] max-w-full bg-[var(--color-surface)] border-l border-[var(--color-outline-variant)] shadow-2xl flex flex-col slide-in-right pointer-events-auto glow-shadow-primary">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--color-outline-variant)] flex items-center justify-between bg-[var(--color-surface-container-low)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-on-surface-variant)]">AI Assistant</h3>
          </div>
          <button
            onClick={closePanel}
            aria-label="Close AI panel"
            className="w-7 h-7 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
          {!aiEnabled && (
            <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[11px] text-[var(--color-error)] font-mono leading-normal flex items-start gap-2 shrink-0">
              <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
              <span>AI Coach is offline. Set GEMINI_API_KEY on the backend server to enable active responses.</span>
            </div>
          )}

          {/* ── Empty state: suggested prompts ── */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col gap-4 pt-4">
              {/* Icon + tagline */}
              <div className="flex flex-col items-center gap-2 text-[var(--color-outline)] opacity-70 mb-2">
                <span
                  className="material-symbols-outlined text-[40px] text-[var(--color-primary)]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  smart_toy
                </span>
                <p className="text-center text-[11px] font-mono tracking-widest uppercase text-[var(--color-on-surface-variant)]">
                  Your AI coach. Ask anything.
                </p>
              </div>

              {/* Suggested prompt chips */}
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-outline)] px-1">Suggested</p>
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.text)}
                    className={`flex items-center gap-3 px-3 py-2.5 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 text-left transition-all duration-200 group anim-fade-up-${i + 1}`}
                  >
                    <span
                      className="material-symbols-outlined text-[16px] text-[var(--color-outline)] group-hover:text-[var(--color-primary)] transition-colors shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {p.icon}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)] transition-colors leading-snug tracking-wide">
                      {p.text}
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-[var(--color-outline)] group-hover:text-[var(--color-primary)] ml-auto shrink-0 transition-colors">
                      arrow_forward
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 max-w-[92%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              <div className={`w-6 h-6 flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]' : 'border-[var(--color-primary)]/30 text-[var(--color-primary)]'}`}>
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: msg.role === 'assistant' ? "'FILL' 1" : "'FILL' 0" }}>
                  {msg.role === 'user' ? 'person' : 'auto_awesome'}
                </span>
              </div>
              <div className={`px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap anim-fade-up ${
                msg.role === 'user' 
                  ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]' 
                  : 'bg-[var(--color-primary)]/5 text-[var(--color-on-surface)] border border-[var(--color-primary)]/20'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* ── Typing indicator (3 bouncing dots) ── */}
          {isLoading && (
            <div className="self-start flex gap-2.5 max-w-[90%]">
              <div className="w-6 h-6 flex items-center justify-center shrink-0 border border-[var(--color-primary)]/30 text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <div className="px-4 py-3 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>

        {/* Rate Limit Status Bar */}
        {aiLimit && (
          <div className="px-3 py-2 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-[10px] font-mono flex justify-between items-center text-[var(--color-outline)] shrink-0">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${aiLimit.remaining > 0 ? 'bg-[var(--color-secondary)]' : 'bg-[var(--color-error)]'} animate-pulse`} />
              <span>QUOTA: {aiLimit.remaining}/{aiLimit.burst} REQ</span>
            </div>
            {aiLimit.reset_seconds > 0 ? (
              <span className="text-[var(--color-error)] font-bold">COOLDOWN: {Math.ceil(aiLimit.reset_seconds)}S</span>
            ) : (
              <span className="text-[var(--color-secondary)] uppercase">Nominal</span>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask your AI coach..."
              disabled={isLoading}
              className="flex-1 bg-[var(--color-surface-container)] px-3 py-2.5 outline-none border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[13px] text-[var(--color-on-surface)] transition-colors placeholder:text-[var(--color-outline)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-10 h-10 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90 transition-opacity disabled:opacity-30 press-scale"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
