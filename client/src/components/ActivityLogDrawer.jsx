import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import { X, History, RefreshCw } from 'lucide-react';
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
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex justify-end overscroll-contain select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md h-full shadow-2xl border-l border-borderMuted flex flex-col overscroll-contain select-text"
      >
        {/* Header */}
        <div className="p-4 border-b border-borderMuted flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-ink-700" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-900">
              Audit & Activity Log
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-1 text-ink-500 hover:text-ink-900"
              title="Refresh logs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1 text-ink-400 hover:text-ink-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-borderMuted/60">
          {loading ? (
            <div className="py-12 text-center text-xs text-ink-500">Loading audit log...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-500">No activity logged yet.</div>
          ) : (
            logs.map((log) => (
              <div key={log._id} className="pt-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-900">
                    {log.actorName || 'System'} ({log.actorRole})
                  </span>
                  <span className="text-[10px] text-ink-400">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="font-mono text-[10px] uppercase text-accent font-semibold">
                  {log.action}
                </div>
                {log.details && (
                  <p className="text-[11px] text-ink-600 bg-ink-100/40 p-2 rounded border border-borderMuted/60 font-mono">
                    {JSON.stringify(log.details)}
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
