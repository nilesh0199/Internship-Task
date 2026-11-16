import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import { X, History, RefreshCw, ShieldCheck, Mail, Sliders } from 'lucide-react';
import { toast } from 'sonner';

export function ActivityLogDrawer({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lock body/background scroll while activity drawer is open
  useBodyScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await api.get('/activity');
      if (res.ok) {
        setLogs(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load activity logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end overscroll-contain select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md h-full shadow-float border-l border-black/[0.06] flex flex-col overscroll-contain select-text"
      >
        {/* Header */}
        <div className="p-5 border-b border-borderMuted/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-ink-900 leading-tight">
                Audit & Activity Log
              </h2>
              <span className="text-[10px] text-ink-400 font-medium uppercase tracking-wider">
                Immutable Transparency Trail
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-1.5 text-ink-400 hover:text-ink-900 rounded-full hover:bg-ink-100 transition cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-ink-400 hover:text-ink-900 rounded-full hover:bg-ink-100 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-xs text-ink-400">Loading audit trail...</div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-xs text-ink-400">
              No activity recorded yet. Actions like simulated sends and label overrides appear here.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log._id}
                className="p-3.5 rounded-2xl bg-[#FAF8F5]/80 border border-black/[0.04] space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-ink-700 border border-black/[0.05]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-ink-400 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-ink-800 leading-relaxed font-medium">
                  {log.description}
                </p>
                {log.metadata?.reason && (
                  <p className="text-[11px] text-ink-500 italic bg-white p-2 rounded-xl border border-black/[0.03]">
                    "{log.metadata.reason}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
