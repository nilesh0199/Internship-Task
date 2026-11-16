import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import {
  Search,
  MessageSquare,
  Sparkles,
  Command,
  ArrowRight,
  ExternalLink,
  X,
  Send,
  Loader2,
} from 'lucide-react';

export function CommandPaletteModal({ isOpen, onClose, selectedThreadId, onSelectThread }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Lock body/background scroll while command palette is open
  useBodyScrollLock(isOpen);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleAsk(e) {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    const userQ = query;
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: userQ }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        query: userQ,
        threadId: selectedThreadId,
      });

      if (res.ok && res.data) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: res.data.answer, toolResult: res.data.toolResult },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'AI reasoning temporarily unavailable: ' + (err.message || 'Error occurred'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestedClick(suggested) {
    setQuery(suggested);
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-16 md:pt-20 px-4 overscroll-contain select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-float border border-black/[0.06] overflow-hidden flex flex-col max-h-[82vh] overscroll-contain select-text"
      >
        {/* Top Search Bar */}
        <div className="p-4 md:p-5 border-b border-borderMuted/60 flex items-center gap-3 bg-white">
          <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk(e)}
            placeholder="Ask about your email or search... (e.g. 'What needs Priya's attention?')"
            className="w-full text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 p-1.5 rounded-full hover:bg-ink-100 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Suggested Queries Chips */}
        <div className="px-5 py-3 bg-ink-50/60 border-b border-borderMuted/60 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-ink-400 font-semibold flex-shrink-0 uppercase tracking-wider text-[10px]">
            Suggestions:
          </span>
          {[
            "Show emails needing client's attention",
            "What am I waiting on?",
            "Summarize this conversation",
            "Why was this assigned to Priya?",
            "Upcoming deadlines and conflicts",
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSuggestedClick(prompt)}
              className="px-3 py-1 rounded-full bg-white hover:bg-ink-100 text-ink-700 border border-black/[0.05] shadow-2xs flex-shrink-0 transition-all cursor-pointer font-medium active:scale-95"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Conversation Stream */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 min-h-[240px]">
          {messages.length === 0 ? (
            <div className="py-12 text-center space-y-2.5">
              <div className="h-12 w-12 rounded-full bg-ink-100 text-ink-400 flex items-center justify-center mx-auto">
                <Command className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-ink-700">
                Type any natural-language inquiry or click a suggested prompt above
              </p>
              <p className="text-[11px] text-ink-400 max-w-sm mx-auto leading-relaxed">
                Powered by structured LLM tool calling over your live inbox threads, sender history, and delegation rules.
              </p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {m.role === 'user' ? (
                  <div className="rounded-2xl bg-ink-900 text-white px-4 py-2.5 max-w-[85%] text-xs font-medium leading-relaxed shadow-soft">
                    {m.text}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#F0FDFA] border border-teal-200/60 p-4 max-w-[92%] text-xs text-ink-900 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-label-assistant">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Daybook AI Assistant</span>
                    </div>
                    <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>

                    {/* Tool Result Structured Summary */}
                    {m.toolResult && m.toolResult.count > 0 && (
                      <div className="p-3 bg-white/95 rounded-xl border border-teal-200/60 space-y-2 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                          Matched Conversations ({m.toolResult.count})
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {m.toolResult.threads?.slice(0, 4).map((t) => (
                            <div
                              key={t._id}
                              onClick={() => {
                                onSelectThread?.(t._id);
                                onClose();
                              }}
                              className="p-2 rounded-lg bg-ink-50 hover:bg-teal-50 cursor-pointer flex items-center justify-between transition"
                            >
                              <div className="truncate mr-2">
                                <span className="font-semibold text-ink-900 block truncate">
                                  {t.subject}
                                </span>
                                <span className="text-[10px] text-ink-500">
                                  {t.participants?.[0]?.name}
                                </span>
                              </div>
                              <ArrowRight className="h-3 w-3 text-ink-400 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-ink-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span>Analyzing mailbox context...</span>
            </div>
          )}
        </div>

        {/* Footer Input */}
        <form
          onSubmit={handleAsk}
          className="p-3 border-t border-borderMuted/60 bg-ink-50/50 flex items-center gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a follow-up or search..."
            className="flex-1 px-4 py-2 text-xs bg-white border border-borderMuted rounded-full focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="p-2 rounded-full bg-ink-900 text-white disabled:opacity-40 hover:bg-ink-800 transition cursor-pointer shadow-soft active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
