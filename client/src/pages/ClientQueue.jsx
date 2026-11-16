import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import { DecisionCard } from '../components/DecisionCard.jsx';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Inbox,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export function ClientQueue() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHandled, setShowHandled] = useState(false);
  const [showWaiting, setShowWaiting] = useState(false);

  useEffect(() => {
    loadClientQueue();
    // 10-second polling for live sync between Assistant and Client
    const interval = setInterval(loadClientQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadClientQueue() {
    try {
      const res = await api.get('/threads?segment=client');
      if (res.ok) {
        setThreads(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load client decision queue:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecisionAction(threadId, action, extra = {}) {
    try {
      const res = await api.post(`/threads/${threadId}/client-decision`, {
        action,
        ...extra,
      });

      if (res.ok) {
        if (action === 'approve') {
          toast.success("Draft approved! Maya notified in workspace.");
        } else if (action === 'hand_to_assistant') {
          toast.success('Delegated to Maya with your instructions.');
        } else if (action === 'snooze') {
          toast.success('Snoozed for 24 hours.');
        } else if (action === 'handled') {
          toast.success('Marked as handled.');
        }
        await loadClientQueue();
      }
    } catch (err) {
      toast.error('Action failed: ' + err.message);
    }
  }

  const pendingThreads = threads.filter(
    (t) => t.clientStatus !== 'handled' && t.currentLabel === 'CLIENT_TO_REPLY'
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink-900 pb-20">
      {/* Top Client Bar */}
      <header className="h-16 bg-white border-b border-borderMuted px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-label-clientBg text-label-client flex items-center justify-center font-serif font-bold text-sm">
            PS
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-ink-900 leading-tight">
              Priya Sharma
            </h1>
            <span className="text-[10px] uppercase font-semibold text-ink-500 tracking-wider">
              Decision Queue
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadClientQueue}
            className="p-1.5 rounded-lg border border-borderMuted text-ink-500 hover:text-ink-900 transition cursor-pointer"
            title="Refresh queue"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 pt-8 space-y-8">
        {/* Morning Brief Header Card */}
        <div className="p-6 rounded-2xl bg-white border border-borderMuted shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-label-client">
            <Sparkles className="h-4 w-4" />
            <span>Client Morning Brief</span>
          </div>

          <h2 className="text-2xl font-serif font-bold text-ink-900">
            Good morning, Priya.
          </h2>

          <p className="text-xs text-ink-700 leading-relaxed pt-1">
            Today: <strong className="text-ink-900">{pendingThreads.length} decisions</strong> require your personal signoff,{' '}
            <strong className="text-label-assistant">14 threads</strong> were resolved autonomously by Maya Lin, and{' '}
            <strong className="text-amber-800">5 threads</strong> are waiting on replies from partners.
          </p>
        </div>

        {/* Active Decision Stack */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Decisions Requiring You ({pendingThreads.length})
            </h3>
            <span className="text-xs text-ink-400">Distilled by Maya & AI</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 bg-white rounded-2xl border border-borderMuted animate-pulse space-y-3">
                  <div className="h-4 bg-ink-200 rounded w-1/4" />
                  <div className="h-6 bg-ink-200 rounded w-3/4" />
                  <div className="h-16 bg-ink-100 rounded" />
                </div>
              ))}
            </div>
          ) : pendingThreads.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-borderMuted p-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h4 className="text-lg font-serif font-bold text-ink-900">
                You're all clear!
              </h4>
              <p className="text-xs text-ink-500 max-w-sm mx-auto leading-relaxed">
                Zero emails require your input right now. Maya Lin and the AI safety engine resolved all routine inquiries.
              </p>
            </div>
          ) : (
            pendingThreads.map((thread) => (
              <DecisionCard
                key={thread._id}
                thread={thread}
                draft={thread._id === 'th_10' ? { bodyText: "Hi Alex, Priya and I have confirmed the keynote terms with Fenwick. We look forward to the fireside chat!", _id: 'draft_001' } : null}
                onAction={(action, extra) => handleDecisionAction(thread._id, action, extra)}
              />
            ))
          )}
        </section>

        {/* Collapsed Section: Handled by Assistant */}
        <section className="bg-white rounded-2xl border border-borderMuted overflow-hidden">
          <button
            onClick={() => setShowHandled(!showHandled)}
            className="w-full p-4 flex items-center justify-between text-xs font-semibold text-ink-700 hover:bg-ink-100/50 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Resolved Autonomously by Maya (14)</span>
            </div>
            {showHandled ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
          </button>

          {showHandled && (
            <div className="p-4 pt-0 border-t border-borderMuted/60 divide-y divide-borderMuted/60 text-xs">
              {[
                { subject: 'Flight & Hotel: SF to NYC Tech Week', action: 'Flight UA 1890 ticketed' },
                { subject: 'Catering Menu Selection for Friday All-Hands', action: 'Mediterranean Bowl approved' },
                { subject: 'DHL Customs Clearance - UK Sensor Shipment', action: 'Commercial invoice uploaded' },
                { subject: 'Boardroom Zoom Rooms AV Diagnostics', action: 'Tech access granted for Thursday 8 AM' },
              ].map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-900">{item.subject}</span>
                  <span className="text-[11px] text-ink-500 bg-ink-100 px-2 py-0.5 rounded">
                    {item.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
