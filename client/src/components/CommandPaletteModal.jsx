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
        else {
          // open
        }
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
        { role: 'assistant', text: 'Error contacting AI assistant: ' + err.message },
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
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4 overscroll-contain select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-borderMuted overflow-hidden flex flex-col max-h-[80vh] overscroll-contain select-text"
      >
        {/* Top Search Bar */}
        <div className="p-4 border-b border-borderMuted flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk(e)}
            placeholder="Ask about your email or search... (e.g. 'What needs Priya's attention?')"
            className="w-full text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none bg-transparent"
          />
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Suggested Queries Chips */}
        <div className="px-4 py-2.5 bg-ink-100/40 border-b border-borderMuted flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-ink-500 font-semibold flex-shrink-0">Suggestions:</span>
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
              className="px-2.5 py-1 rounded-full bg-white hover:bg-ink-100 text-ink-700 border border-borderMuted flex-shrink-0 transition cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Conversation Stream */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 min-h-[220px]">
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Command className="h-8 w-8 text-ink-300 mx-auto" />
              <p className="text-xs text-ink-500 font-medium">
                Type any natural-language question or click a suggested prompt above.
              </p>
              <p className="text-[11px] text-ink-400">
                Powered by structured LLM tool calling over MongoDB threads.
              </p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    AI
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[85%] whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-ink-900 text-white rounded-tr-none'
                      : 'bg-ink-100/60 text-ink-900 border border-borderMuted rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-ink-500 italic p-2">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span>Querying thread repository & synthesizing tools...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-ink-100/30 border-t border-borderMuted flex items-center justify-between text-[11px] text-ink-500">
          <span>Press Enter to ask • Esc to close</span>
          <button
            onClick={handleAsk}
            disabled={!query.trim() || loading}
            className="px-3 py-1 rounded bg-ink-900 text-white font-medium hover:bg-ink-800 disabled:opacity-40 cursor-pointer"
          >
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
}
