import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import {
  Sparkles,
  Command,
  ArrowRight,
  X,
  Send,
  Loader2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

/**
 * Safely renders lightweight markdown (**bold**, _italic_, and [label](url)) into React elements
 */
function renderFormattedLine(line, onOpenLink, keyPrefix) {
  const tokenRegex = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const parts = line.split(tokenRegex);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      // Recursively render any inline markdown links inside bold text (e.g. **Summary of [Title](url):**)
      if (inner.includes('[') && inner.includes('](')) {
        return (
          <strong key={key} className="font-semibold text-ink-900">
            {renderFormattedLine(inner, onOpenLink, `${key}-b`)}
          </strong>
        );
      }
      return (
        <strong key={key} className="font-semibold text-ink-900">
          {inner}
        </strong>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return (
        <em key={key} className="italic text-ink-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onOpenLink(href)}
          className="inline font-semibold text-teal-800 underline decoration-teal-400/70 underline-offset-2 hover:text-ink-900 cursor-pointer text-left"
        >
          {label}
        </button>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  selectedThreadId,
  onSelectThread,
  clientId = null,
  clientName = null,
}) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  // Lock body/background scroll while command palette is open
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  async function submitQuery(rawText) {
    const userQ = (rawText || '').trim();
    if (!userQ || loading) return;

    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: userQ }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        query: userQ,
        threadId: selectedThreadId || null,
        clientId: clientId || null,
      });

      if (res.ok && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: res.data.answer,
            toolResult: res.data.toolResult,
            usedAgentRuntime: Boolean(res.data.usedAgentRuntime),
            provider: res.data.provider || null,
            model: res.data.model || null,
            byokError: res.data.byokError || null,
          },
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

  function handleAsk(e) {
    e?.preventDefault();
    submitQuery(query);
  }

  function handleSuggestedClick(suggested) {
    submitQuery(suggested);
  }

  function handleJumpToThread(tId, targetClientId) {
    if (onSelectThread && (!targetClientId || targetClientId === clientId) && clientId) {
      onSelectThread(tId);
    } else {
      const destClient = targetClientId || clientId || 'client_priya_001';
      navigate(`/assistant/c/${destClient}/inbox?threadId=${tId}`);
    }
    onClose();
  }

  function handleOpenMarkdownLink(href) {
    try {
      const url = new URL(href, window.location.origin);
      const tId = url.searchParams.get('threadId');
      const clientMatch = url.pathname.match(/\/assistant\/c\/([^/]+)/);
      const targetClient = clientMatch?.[1] || clientId || 'client_priya_001';
      if (tId) {
        handleJumpToThread(tId, targetClient);
        return;
      }
      navigate(url.pathname + url.search);
      onClose();
    } catch {
      onClose();
    }
  }

  const scopeLabel = clientName || (clientId ? 'Active Client' : 'All Clients');

  const suggestions = [
    "Show emails needing client's attention",
    'What am I waiting on?',
    'Summarize this conversation',
    'Why was this assigned to client?',
    'Upcoming deadlines and conflicts',
    'Inbox overview & counts',
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-14 md:pt-20 px-4 overscroll-contain select-none"
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
            placeholder={`Ask about ${scopeLabel} or search threads... (e.g. 'Mark Suster', 'deadlines')`}
            className="w-full text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none bg-transparent"
          />
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-ink-50 border border-black/[0.06] text-[10px] font-mono text-ink-500 flex-shrink-0">
            {scopeLabel}
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="text-ink-400 hover:text-ink-900 p-1.5 rounded-full hover:bg-ink-100 transition cursor-pointer"
              title="Clear conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 p-1.5 rounded-full hover:bg-ink-100 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Suggested Queries Chips (1-click instant execution) */}
        <div className="px-5 py-3 bg-ink-50/60 border-b border-borderMuted/60 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-ink-400 font-semibold flex-shrink-0 uppercase tracking-wider text-[10px]">
            Ask:
          </span>
          {suggestions.map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleSuggestedClick(prompt)}
              className="px-3 py-1 rounded-full bg-white hover:bg-ink-100 text-ink-700 border border-black/[0.06] shadow-2xs flex-shrink-0 transition-all cursor-pointer font-medium active:scale-95 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Conversation Stream */}
        <div ref={scrollRef} className="p-5 overflow-y-auto flex-1 space-y-4 min-h-[240px]">
          {messages.length === 0 ? (
            <div className="py-10 text-center space-y-2.5">
              <div className="h-12 w-12 rounded-full bg-ink-100 text-ink-400 flex items-center justify-center mx-auto">
                <Command className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-ink-700">
                Click any prompt above or ask a question about your inbox
              </p>
              <p className="text-[11px] text-ink-400 max-w-sm mx-auto leading-relaxed">
                Searches live threads, AI reasoning, deadlines, and delegation rules. Click any matched thread to jump straight to it.
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
                  <div className="rounded-2xl bg-[#F0FDFA] border border-teal-200/60 p-4 max-w-[94%] text-xs text-ink-900 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-label-assistant">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Daybook AI Assistant</span>
                      </div>
                      <span className="text-[10px] font-mono text-teal-800/70">
                        {m.usedAgentRuntime
                          ? m.provider
                            ? `${m.provider} · ${m.model}`
                            : 'Live Agent Loop'
                          : 'Inbox Tools'}
                      </span>
                    </div>

                    {m.byokError && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300/80 text-[11px] text-amber-950 flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-semibold">
                            Your {m.byokError.provider || 'API'} key returned an error — answered using local Inbox Tools.
                          </div>
                          <div className="text-amber-900">{m.byokError.message}</div>
                          {m.byokError.hint && <div className="text-amber-800/90">{m.byokError.hint}</div>}
                        </div>
                      </div>
                    )}

                    <div className="leading-relaxed space-y-1.5">
                      {(m.text || '').split('\n').map((line, lineIdx) =>
                        line.trim() === '' ? (
                          <div key={lineIdx} className="h-1" />
                        ) : (
                          <p key={lineIdx}>
                            {renderFormattedLine(line, handleOpenMarkdownLink, `${idx}-${lineIdx}`)}
                          </p>
                        )
                      )}
                    </div>

                    {/* Tool Result Structured Clickable Cards */}
                    {m.toolResult && m.toolResult.count > 0 && (
                      <div className="p-3 bg-white/95 rounded-xl border border-teal-200/60 space-y-2 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                          Matched Conversations ({m.toolResult.count})
                        </span>
                        <div className="space-y-1.5 max-h-44 overflow-y-auto">
                          {m.toolResult.threads?.slice(0, 5).map((t) => (
                            <button
                              key={t._id}
                              type="button"
                              onClick={() => handleJumpToThread(t._id, t.clientId)}
                              className="w-full text-left p-2.5 rounded-lg bg-ink-50 hover:bg-teal-50 cursor-pointer flex items-center justify-between transition"
                            >
                              <div className="truncate mr-2">
                                <span className="font-semibold text-ink-900 block truncate">
                                  {t.subject}
                                </span>
                                <span className="text-[10px] text-ink-500">
                                  {t.participants?.[0]?.name || t.participants?.[0]?.email || 'Sender'}
                                  {t.deadline ? ` · Due: ${t.deadline}` : ''}
                                </span>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-teal-700 flex-shrink-0" />
                            </button>
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
