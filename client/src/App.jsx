import React, { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to connect to server API:', err);
        setHealth({ ok: false, error: err.message });
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAF8F5] text-ink-900 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl border border-borderMuted p-8 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            System Scaffolded
          </span>
        </div>
        <h1 className="text-2xl font-serif font-bold text-ink-900 mb-2">
          ReplyRight
        </h1>
        <p className="text-sm text-ink-700 mb-6">
          Personal Assistant Inbox prototype environment initialized. Ready for Phase 1.
        </p>

        <div className="p-3 rounded-lg bg-ink-100 text-xs font-mono text-ink-700">
          <div>Backend Health: {loading ? 'Checking...' : health?.ok ? 'Connected (200 OK)' : 'Offline / Error'}</div>
          {health?.timestamp && <div>Server Time: {health.timestamp}</div>}
        </div>
      </div>
    </div>
  );
}
